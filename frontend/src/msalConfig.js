// msalConfig.js
import { PublicClientApplication } from "@azure/msal-browser";

const msalConfig = {
    auth: {
        clientId: "e5b5dae5-0c0e-4461-95a3-e33f60ece1a0", // This is your Azure AD app's Application (client) ID
        authority: "https://login.microsoftonline.com/ce01571d-99e3-4024-96da-485b99ffb370", // e.g. "https://login.microsoftonline.com/yourtenantid"
        redirectUri: "https://gymaiengine.com/.auth/login/aad/callback", // The URI Azure AD will redirect back to (should match one of your App Registration’s redirect URIs)
    }
};

// Optional scopes you want to request
export const loginRequest = {
    scopes: ["User.Read"] // example scope
};

export const msalInstance = new PublicClientApplication(msalConfig);
