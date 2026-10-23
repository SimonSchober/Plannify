import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const CREDENTIALS_KEY = "plannify.biometric.credentials";
const ENABLED_KEY = "plannify.biometric.enabled";

export async function isBiometricAvailable() {
  try {
    const [secureStoreAvailable, hardwareAvailable, enrolled] = await Promise.all([
      SecureStore.isAvailableAsync(),
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return secureStoreAvailable && hardwareAvailable && enrolled;
  } catch (error) {
    console.warn("Could not check biometric availability", error);
    return false;
  }
}

export async function hasSavedCredentials() {
  try {
    return (await SecureStore.getItemAsync(ENABLED_KEY)) === "true";
  } catch (error) {
    return false;
  }
}

export async function saveCredentials(
  email,
  password,
  prompt = "Authenticate to save your login",
) {
  if (!email || !password) {
    throw new Error("Email and password are required to enable biometric login.");
  }

  await SecureStore.setItemAsync(
    CREDENTIALS_KEY,
    JSON.stringify({ email: email.trim(), password }),
    {
      requireAuthentication: true,
      authenticationPrompt: prompt,
    },
  );
  await SecureStore.setItemAsync(ENABLED_KEY, "true");
}

export async function getCredentialsWithBiometric(
  prompt = "Authenticate to sign in to Plannify",
) {
  const value = await SecureStore.getItemAsync(CREDENTIALS_KEY, {
    requireAuthentication: true,
    authenticationPrompt: prompt,
  });
  if (!value) return null;

  try {
    const credentials = JSON.parse(value);
    return credentials.email && credentials.password ? credentials : null;
  } catch (error) {
    return null;
  }
}

export async function clearCredentials() {
  try {
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
  } finally {
    await SecureStore.deleteItemAsync(ENABLED_KEY);
  }
}
