import { ConvexError, v } from "convex/values";
import { mutation, MutationCtx, query, QueryCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { DURATIONS, TICKET_STATUS, WAITING_LIST_STATUS } from "./constants";
import { Id } from "./_generated/dataModel";
import { processQueue } from "./waitingList";


export const updateEvent = mutation({
    args: {
        eventId: v.id("events"),
        name: v.string(),
        description: v.string(),
        location: v.string(),
        eventDate: v.number(),
        price: v.number(),
        totalTickets: v.number(),
    },
    handler: async (ctx, args) => {
        const { eventId, ...updates } = args;

        // Get current event to check tickets sold
        const event = await ctx.db.get(eventId);
        if (!event) throw new Error("Event not found");

        const soldTickets = await ctx.db
            .query("tickets")
            .withIndex("by_event", (q) => q.eq("eventId", eventId))
            .filter((q) => q.or(q.eq(q.field("status"), "vails"), q.eq(q.field("status"), "used"))
            ).collect()

        // Ensure new total tickets is not less than sold tickets
        if (updates.totalTickets < soldTickets.length) {
            throw new Error(
                `Cannot reduce total ticket below the ${soldTickets.length} {number of ticket already sold}`
            );
        }

        await ctx.db.patch(eventId, updates);
        return eventId;
    }
})


export const create = mutation({
    args: {
        name: v.string(),
        description: v.string(),
        location: v.string(),
        eventDate: v.number(),
        price: v.number(),
        totalTickets: v.number(),
        userId: v.string(),

    },
    handler: async (ctx, args) => {
        const eventId = await ctx.db.insert("events", {
            name: args.name,
            description: args.description,
            location: args.location,
            eventDate: args.eventDate,
            price: args.price,
            totalTickets: args.totalTickets,
            userId: args.userId
        });
        return eventId;
    }
});

export const get = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("events")
            .collect();
    }
})

export const getById = query({
    args: { eventId: v.id("events") },
    handler: async (ctx, { eventId }) => {
        return await ctx.db.get(eventId);
    }
})


export const getEventAvailability = query({
    args: { eventId: v.id("events") },
    handler: async (ctx, { eventId }) => {
        const event = await ctx.db.get(eventId);
        if (!event) {
            return null;
        }

        // Count total purchased tikets
        const PurchasedTickets = await ctx.db
            .query("tickets")
            .withIndex("by_event", (q) => q.eq("eventId", eventId))
            .collect()
            .then((tickets) =>
                tickets.filter((t) =>
                    t.status === TICKET_STATUS.VALID ||
                    t.status === TICKET_STATUS.USED).length);


        // count current valid offers

        const now = Date.now();
        const activeOffers = await ctx.db
            .query("waitingList")
            .withIndex("by_event_status", (q) =>
                q.eq("eventId", eventId).eq("status", WAITING_LIST_STATUS.OFFERED))
            .collect()
            .then((entries) => entries.filter((e) => (e.offerExpiresAt ?? 0) > now).length);


        const totalReserved = PurchasedTickets + activeOffers;

        return {
            isSoldOut: totalReserved >= event.totalTickets,
            totalTickets: event.totalTickets,
            PurchasedTickets,
            activeOffers,
            remainingTickets: Math.max(0, event.totalTickets - totalReserved),

        }

    }
});

// 1. Create a plain internal helper function (not wrapped in query)
async function getAvailabilityInternal(ctx: QueryCtx | MutationCtx, eventId: Id<"events">) {


    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event not found");

    const purchasedCount = await ctx.db
        .query("tickets")
        .withIndex("by_event", (q) => q.eq("eventId", eventId))
        .collect()
        .then(
            (tickets) =>
                tickets.filter(
                    (t) =>
                        t.status === TICKET_STATUS.VALID ||
                        t.status === TICKET_STATUS.USED
                ).length
        );

    const now = Date.now();
    const activeOffers = await ctx.db
        .query("waitingList")
        .withIndex("by_event_status", (q) => q.eq("eventId", eventId).eq("status", WAITING_LIST_STATUS.OFFERED))
        .collect()
        .then((entries) => entries.filter((e) => (e.offerExpiresAt ?? 0) > now).length);

    const availableSpots = event.totalTickets - (purchasedCount + activeOffers);

    return {
        available: availableSpots > 0,
        availableSpots,
        totalTickets: event.totalTickets,
        purchasedCount,
        activeOffers,
    };
}

export const checkAvailability = query({
    args: { eventId: v.id("events") },
    handler: async (ctx, { eventId }) => {
        return await getAvailabilityInternal(ctx, eventId);
    }
});



// join waiting list for an event
export const joinWaitingList = mutation({
    // Function takes an event ID and user ID as arguments
    args: { eventId: v.id("events"), userId: v.string() },
    handler: async (ctx, { eventId, userId }) => {
        // // Rate limit check
        // const status = await rateLimter.limit(ctx, "queueJoin", {key: userId});
        // if(!status.ok) {
        //     throw new ConvexError(
        //         `You've joined the waitingList list too may times. Please wait ${Math.ceil(status.retryAfter / (60 * 1000)
        //         )} minutes before trying again`
        //     )
        // }

        // First check if user already has an active antry in wating list for this event 
        // Active means any status except EXPIRED
        const existingEntry = await ctx.db
            .query("waitingList")
            .withIndex("by_user_event", (q) =>
                q.eq("userId", userId).eq("eventId", eventId)
            )
            .filter((q) => q.neq(q.field("status"), WAITING_LIST_STATUS.EXPIRED))
            .first();
        if (existingEntry) {
            throw new Error("Already in waiting list for this event");
        }

        // Verify the event
        const event = await ctx.db.get(eventId);
        if (!event) throw new Error("Eevent no Found")

        // Check  if there are any available tickets right now
        const { available } = await getAvailabilityInternal(ctx, eventId);

        const now = Date.now();

        if (available) {
            // If tickets are available create an offer entry
            const waitingListId = await ctx.db.insert("waitingList", {
                eventId,
                userId,
                status: WAITING_LIST_STATUS.OFFERED,
                offerExpiresAt: now + DURATIONS.TICKET_OFFER
            });

            // schedule a job to expire this offer after thr offer duration

            await ctx.scheduler.runAfter(
                DURATIONS.TICKET_OFFER,
                internal.waitingList.expireOffer,
                {
                    waitingListId,
                    eventId
                }
            )
        } else {
            //  If no tickets available, add to waiting list
            await ctx.db.insert("waitingList", {
                eventId,
                userId,
                status: WAITING_LIST_STATUS.WAITING
            });
        }

        // REtyurn appropriate status message
        return {
            success: true,
            status: available
                ? WAITING_LIST_STATUS.OFFERED
                : WAITING_LIST_STATUS.WAITING,
            message: available
                ? `Ticket offered - you have ${DURATIONS.TICKET_OFFER / (60 * 1000)} minutes to purchse`
                : `Added to waiting list - you'll be notified when a ticket becomed=s`
        }
    }
});
//  Purchase ticket

export const purchaseTicket = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.string(),
    waitingListId: v.id("waitingList"),
    paymentInfo: v.object({
      paymentIntentId: v.string(),
      amount: v.number(),
    }),
  },
  handler: async (ctx, { eventId, userId, waitingListId, paymentInfo }) => {
    console.log("Starting purchaseTicket handler", {
      eventId,
      userId,
      waitingListId,
    });

    // Verify waiting list entry exists and is valid
    const waitingListEntry = await ctx.db.get(waitingListId);
    console.log("Waiting list entry:", waitingListEntry);

    if (!waitingListEntry) {
      console.error("Waiting list entry not found");
      throw new Error("Waiting list entry not found");
    }

    if (waitingListEntry.status !== WAITING_LIST_STATUS.OFFERED) {
      console.error("Invalid waiting list status", {
        status: waitingListEntry.status,
      });
      throw new Error(
        "Invalid waiting list status - ticket offer may have expired"
      );
    }

    if (waitingListEntry.userId !== userId) {
      console.error("User ID mismatch", {
        waitingListUserId: waitingListEntry.userId,
        requestUserId: userId,
      });
      throw new Error("Waiting list entry does not belong to this user");
    }

    // Verify event exists and is active
    const event = await ctx.db.get(eventId);
    console.log("Event details:", event);

    if (!event) {
      console.error("Event not found", { eventId });
      throw new Error("Event not found");
    }

    if (event.is_cancelled) {
      console.error("Attempted purchase of cancelled event", { eventId });
      throw new Error("Event is no longer active");
    }

    try {
      console.log("Creating ticket with payment info", paymentInfo);
      // Create ticket with payment info
      await ctx.db.insert("tickets", {
        eventId,
        userId,
        purchaseAt: Date.now(),
        status: TICKET_STATUS.VALID,
        paymentIntentId: paymentInfo.paymentIntentId,
        amount: paymentInfo.amount,
      });

      console.log("Updating waiting list status to purchased");
      await ctx.db.patch(waitingListId, {
        status: WAITING_LIST_STATUS.PURCHASED,
      });

      console.log("Processing queue for next person");
      // Process queue for next person
await ctx.runMutation(internal.waitingList.processQueue, {
    eventId,
});
      console.log("Purchase ticket completed successfully");
    } catch (error) {
      console.error("Failed to complete ticket purchase:", error);
      throw new Error(`Failed to complete ticket purchase: ${error}`);
    }
  },
});


