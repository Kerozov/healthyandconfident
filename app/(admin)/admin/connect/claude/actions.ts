"use server";

import { requireOwner } from "@/lib/admin/auth";
import {
  approveWithEmailCode,
  revokeConnection,
  startEmailChallenge,
  validateAuthorizeRequest,
} from "@/lib/mcp/oauth";
import { maskEmail, redirectWithCode } from "@/lib/mcp/oauth-rules";
import { MCP_OWNER_EMAIL } from "@/lib/mcp/owner";
import type { AuthorizeParams } from "./types";

type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string };

async function validated(params: AuthorizeParams) {
  return validateAuthorizeRequest({
    clientId: params.clientId,
    redirectUri: params.redirectUri,
    codeChallenge: params.codeChallenge,
    codeChallengeMethod: params.codeChallengeMethod,
    responseType: params.responseType,
  });
}

/** Праща код на собственика. Адресът е фиксиран в кода, не идва от формата. */
export async function requestConnectorCode(
  params: AuthorizeParams,
): Promise<Result<{ challengeId: string; sentTo: string }>> {
  const check = await validated(params);
  if (!check.ok) return check;
  const started = await startEmailChallenge(check.client, params.redirectUri);
  if (!started.ok) return started;
  return { ok: true, challengeId: started.challengeId, sentTo: maskEmail(MCP_OWNER_EMAIL) };
}

export async function approveConnector(
  params: AuthorizeParams,
  challengeId: string,
  emailCode: string,
): Promise<Result<{ redirectTo: string }>> {
  const check = await validated(params);
  if (!check.ok) return check;
  const approved = await approveWithEmailCode({
    challengeId: String(challengeId ?? ""),
    emailCode: String(emailCode ?? ""),
    clientId: check.client.id,
    redirectUri: params.redirectUri,
    codeChallenge: params.codeChallenge,
  });
  if (!approved.ok) return approved;
  return {
    ok: true,
    redirectTo: redirectWithCode(params.redirectUri, { code: approved.code, state: params.state }),
  };
}

export async function denyConnector(params: AuthorizeParams): Promise<Result<{ redirectTo: string }>> {
  const check = await validated(params);
  if (!check.ok) return check;
  return {
    ok: true,
    redirectTo: redirectWithCode(params.redirectUri, { error: "access_denied", state: params.state }),
  };
}

export async function revokeConnectorAction(clientId: string): Promise<Result> {
  try {
    await requireOwner({ screen: "team", action: "delete", summary: "Откачи Claude от админа" });
  } catch {
    return { ok: false, message: "Само главният админ може да откача връзки." };
  }
  const done = await revokeConnection(String(clientId ?? ""));
  return done ? { ok: true } : { ok: false, message: "Връзката не се откачи. Опитай пак." };
}
