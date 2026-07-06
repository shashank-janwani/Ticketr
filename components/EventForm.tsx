"use client";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import * as z from "zod";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, Form, useForm } from "react-hook-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "./ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "./ui/input-group";
import { useStorageUrl } from "@/lib/utils";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Event name is required."),
  description: z.string().min(1, "Description is required."),
  location: z.string().min(1, "Location is required."),
  eventDate: z
    .date()
    .min(new Date().setHours(0, 0, 0, 0), "Event date must be in the future."),
  price: z.number().min(0, "Price must be a positive number."),
  totalTickets: z.number().min(1, "Total tickets must be at least 1."),
});

type FormData = z.infer<typeof formSchema>;

interface InitialEventData {
  _id: Id<"events">;
  name: string;
  description: string;
  location: string;
  eventDate: number;
  price: number;
  totalTickets: number;
  imageStorageId?: Id<"_storage">;
}

interface EventFormProps {
  mode: "create" | "edit";
  initialData?: InitialEventData;
}

function EventForm({ mode, initialData }: EventFormProps) {
  const { user } = useUser();
  const createEvent = useMutation(api.events.create);
  const updateEvent = useMutation(api.events.updateEvent);
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const currentImageUrl = useStorageUrl(initialData?.imageStorageId);

  // Image upload
  const imageInput = React.useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const updateEventImage = useMutation(api.storage.updateEventImage);
  const deleteImage = useMutation(api.storage.deleteImage);

  const [removedCurrentImage, setRemovedCurrentImage] =
    useState<boolean>(false);
  {
  }

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      location: initialData?.location || "",
      eventDate: initialData ? new Date(initialData.eventDate) : new Date(),
      price: initialData?.price ?? 0,
      totalTickets: initialData?.totalTickets ?? 1,
    },
  });

  async function onSubmit(values: FormData) {
    if(!user?.id) return;

    startTransition(async () => {
      try {
        let imageStorageId = null;
        // Handle image changes
        if(selectedImage) {
          // Upload new image
          imageStorageId = await handleImageUpload(selectedImage);
        }

        // Handle image deletion/update in edit mode
        if(mode === "edit" && initialData?.imageStorageId){
          if(removedCurrentImage || selectedImage) {
              // Deletion old image from storage
          await deleteImage({
            storageId: initialData?.imageStorageId,
          });
          }
        }

        if(mode === "create") {
          const eventId = await createEvent({
            ...values,
            userId: user.id,
            eventDate: values.eventDate.getTime()
          });
          if(imageStorageId) {
            await updateEventImage({
              eventId,
              storageId: imageStorageId as Id<"_storage">
            });
          }
          router.push(`/event/${eventId}`); 
        } else{
          // Ensure initialData exists before proceeding with update
          if(!initialData){
            throw new Error("initial event data is required for updates ");
          }
          // Update event Details
          await updateEvent({
            eventId: initialData._id,
            ...values,
            eventDate: values.eventDate.getTime()
          });

          // Update image -n this will now handle both adding new inage and removing existing image 
          if(imageStorageId || removedCurrentImage) {
            await updateEventImage({
              eventId: initialData._id,
              // If we have a new image , use its ID, otherwise if we're removing the image, pass null
              storageId: imageStorageId
              ? (imageStorageId as Id<"_storage">)
              : null,
            });
          }

          toast("Event updated", {
          description: "Your event has been successfully updated",
         });

         router.push(`/event/${initialData._id}`);
        }
      } catch (error) {
        console.error("Failed to handle event:", error);
        toast("Uh oh! Something went wrong",
           {
          description: "Sunday, December 03, 2023 at 9:00 AM",
         });
      }
    })
  }

  async function handleImageUpload(file: File): Promise<string | null> {
    try {
      const postUrl = await generateUploadUrl();
      console.log(postUrl);
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      return storageId;
    } catch (error) {
      console.error("Error uploading image:", error);
      return null;
    }
  }

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <form
      id="form-rhf-demo"
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-6"
    >
      <div className="space-y-4">
        <FieldGroup>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="form-rhf-demo-name">Event Name</FieldLabel>
                <Input
                  {...field}
                  id="form-rhf-demo-name"
                  aria-invalid={fieldState.invalid}
                  placeholder="Enter event name"
                  autoComplete="off"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="description"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="form-rhf-demo-description">
                  Description
                </FieldLabel>
                <InputGroup>
                  <InputGroupTextarea
                    {...field}
                    id="form-rhf-demo-description"
                    placeholder="Enter event description"
                    rows={6}
                    className="min-h-24 resize-none"
                    aria-invalid={fieldState.invalid}
                  />
                </InputGroup>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="location"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="form-rhf-demo-location">
                  Location
                </FieldLabel>
                <Input
                  {...field}
                  id="form-rhf-demo-location"
                  aria-invalid={fieldState.invalid}
                  placeholder="Enter event location"
                  autoComplete="off"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="eventDate"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="form-rhf-demo-eventDate">
                  Event Date
                </FieldLabel>
                <Input
                  type="date"
                  {...field}
                  onChange={(e) => {
                    field.onChange(
                      e.target.value ? new Date(e.target.value) : null,
                    );
                  }}
                  value={
                    field.value
                      ? new Date(field.value).toISOString().split("T")[0]
                      : ""
                  }
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="price"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="form-rhf-demo-price">
                  Price per Ticket
                </FieldLabel>
                <InputGroup>
                  <InputGroupAddon>₹</InputGroupAddon>

                  <Input
                    placeholder="Enter ticket price"
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className="w-full"
                  />
                </InputGroup>
              </Field>
            )}
          />
          <Controller
            name="totalTickets"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="form-rhf-demo-totaltickets">
                  Total Tickets Available
                </FieldLabel>
                <InputGroup>
                  <InputGroupAddon>🎟️</InputGroupAddon>

                  <Input
                    placeholder="Enter total tickets available"
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className="w-full"
                  />
                </InputGroup>
              </Field>
            )}
          />
        </FieldGroup>
        {/* Image Upload */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Event Image
          </label>
          <div className="flex items-center mt-1 gap-4">
            {imagePreview || (!removedCurrentImage && currentImageUrl) ? (
              <div className="relative w-32 aspect-square bg-gray-100 rounded-lg">
                <Image
                  src={imagePreview || currentImageUrl!}
                  alt="Event Image preview"
                  fill
                  className="object-contain rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                    setRemovedCurrentImage(true);
                    if (imageInput.current) {
                      imageInput.current.value = "";
                    }
                  }}
                  className="absolute -top-2 -right-1 bg-red-500 text-white rounded-full w-6 h-6 hover:bg-red-600 flex items-center justify-center tracking-colors"
                >
                  ✖
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                ref={imageInput}
                className="block w-full text-sm text-gray-50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            )}
          </div>
        </div>
      </div>

       <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {mode === "create" ? "Creating Event..." : "Updating Event..."}
            </>
          ) : mode === "create" ? (
            "Create Event"
          ) : (
            "Update Event"
          )}
        </Button>
    </form>
  );
}

export default EventForm;
