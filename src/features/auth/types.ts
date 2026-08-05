// Shared auth types. Kept out of actions.ts because a "use server" module may
// only export async functions.

export type SignInState = {
  status: "idle" | "sent" | "invalid";
};
