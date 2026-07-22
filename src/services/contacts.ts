import { Contact } from "expo-contacts";
import * as Contacts from "expo-contacts";
import { Platform } from "react-native";

export type PickedContact = {
  name: string;
  phone: string;
  photoUri: string | null;
};

export type PickContactFailureReason =
  "cancelled" | "denied" | "unavailable" | "error" | "empty";

export type PickContactResult =
  | { ok: true; contact: PickedContact }
  | { ok: false; reason: PickContactFailureReason; message: string };

/**
 * Opens the OS contact picker for a single contact after a contacts permission
 * grant. Does not scan or upload the address book.
 *
 * Callers should show a pre-permission explanation before invoking this.
 */
export async function pickOneContact(): Promise<PickContactResult> {
  if (Platform.OS === "web") {
    return {
      ok: false,
      reason: "unavailable",
      message:
        "Contact picking works on Android and iOS. You can still type a name.",
    };
  }

  try {
    const current = await Contacts.getPermissionsAsync();
    let status = current.status;
    if (status !== "granted") {
      const requested = await Contacts.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== "granted") {
      return {
        ok: false,
        reason: "denied",
        message:
          "Contacts access was not granted. You can still add a friend by typing a name.",
      };
    }

    const contact = await Contact.presentPicker();
    if (!contact) {
      return {
        ok: false,
        reason: "cancelled",
        message: "No contact selected.",
      };
    }

    const [fullName, phones, image] = await Promise.all([
      contact.getFullName(),
      contact.getPhones(),
      contact.getImage(),
    ]);

    const name = fullName.trim();
    if (!name) {
      return {
        ok: false,
        reason: "empty",
        message:
          "That contact has no name on file. You can type a name instead.",
      };
    }

    return {
      ok: true,
      contact: {
        name,
        phone: phones[0]?.number?.trim() ?? "",
        photoUri: image,
      },
    };
  } catch {
    return {
      ok: false,
      reason: "error",
      message:
        "Could not open contacts. You can still add a friend by typing a name.",
    };
  }
}
