"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useStorageUrl } from "@/lib/utils";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import Spinnner from "../../../components/Spinnner";
import Image from "next/image";
import { Calendar, CalendarDays, MapPin, Ticket, Users } from "lucide-react";
import EventCard from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import JoinQueue from "@/components/JoinQueue";

function EventPage() {
const { user, isLoaded } = useUser();  const params = useParams();
  const event = useQuery(api.events.getById, {
    eventId: params.id as Id<"events">,
  });
  const availabililty = useQuery(api.events.getEventAvailability, {
    eventId: params.id as Id<"events">,
  });

  const imageUrl = useStorageUrl(event?.imageStorageId);

  if (!event) {
    return (
      <div className="min-h-screen  flex items-center justify-center ">
        <Spinnner />
      </div>
    );
  }
  if (!availabililty) return null;

  if (availabililty === undefined) {
    return <Spinnner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* {event details} */}
      <div className="max-w-7xl mx-auto px-4 m:px-6 lg:-8 py-12">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* {event image} */}
          {imageUrl && (
            <div className="aspect-[121/9] relative w-full">
              <Image
                src={imageUrl}
                alt={Object.name}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          {/* {event details in depth} */}
          <div className="p-8">
            <div className="grid grs-cols-1 lg:grid-cols-2 gap-12 ">
              {/* {left column - event Details} */}
              <div className="space-y-8">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    {event.name}
                  </h1>
                  <p className="text-lg text-gray-600">{event.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="flex items-center text-gray-600 mb-1">
                      <CalendarDays className="w-5 h-5 mr-2 text-blue-600" />
                      <span className="text-sm font-medium">Date</span>
                    </div>
                    <p className="text-gray-900">
                      {new Date(event.eventDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg norderborder-gray-100">
                    <div className="flex items-center text-gray-600 mb-1 ">
                      <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                      <span className="text-sm font-medium">Location</span>
                    </div>
                    <p className="text-gray-900">{event.location}</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="flex items-center text-gray-600 mb-1">
                      <Ticket className="w-5 h-5 mr-2 text-blue-600" />
                      <span className="text-sm font-medium">Price</span>
                    </div>
                    <p className="text-gray-900">₹{event.price.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="flex items-center text-gray-600 mb-1">
                      <Users className="w-5 h-5 mr-2 text-blue-600" />
                      <span className="text-sm font-edium ">Availability</span>
                    </div>
                    <p className="text-gray-900">
                      {availabililty.totalTickets -
                        availabililty.PurchasedTickets}{" "}
                      {""}/ {availabililty.totalTickets} left
                    </p>
                  </div>
                </div>

                {/* additinal event information */}

                <div className="bg--blue-50 border border-blue-100 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    Event Information
                  </h3>
                  <ul className="space-y-2 text-blue-700">
                    <li>- Please arrive 30 minutes before the event starts</li>
                    <li>- Tickets are non-refundable</li>
                    <li>- Age restriction: 18+</li>
                  </ul>
                </div>
              </div>
              {/* Right Column - purchase Ticket */}
              <div className="sticky top-8 space-y-4">
                <EventCard eventId={params.id as Id<"events">} />

                    {user ? (
                        <JoinQueue eventId ={params.id as Id<"events">}
                        userId = {user.id} />
                    ) : (
                        <SignInButton>
                            <Button className="w-full bg-gradient-to-r from-bluew-600 to-blue-800 hover:from-blue700 hover:to-blue-900 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 shadow-md hover:sahdow-lg ">
                                Sign In to buy tickets
                            </Button>
                        </SignInButton>
                    )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventPage;
