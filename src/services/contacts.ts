import { Contact } from 'expo-contacts';
import { Platform } from 'react-native';

export type PickedContact = {
  name: string;
  phone: string;
  photoUri: string | null;
};

/**
 * Opens the OS contact picker for a single contact.
 * Does not request broad contacts permission or upload the address book.
 */
export async function pickOneContact(): Promise<PickedContact | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  const contact = await Contact.presentPicker();
  if (!contact) {
    return null;
  }

  const [fullName, phones, image] = await Promise.all([
    contact.getFullName(),
    contact.getPhones(),
    contact.getImage(),
  ]);

  const name = fullName.trim();
  if (!name) {
    return null;
  }

  return {
    name,
    phone: phones[0]?.number?.trim() ?? '',
    photoUri: image,
  };
}
