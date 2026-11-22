import type { Metadata } from "next";
import { Bot } from "lucide-react";
import { AdminSessionUnavailableError, getAdminSession } from "@/lib/admin/auth";
import { listConnections, validateAuthorizeRequest } from "@/lib/mcp/oauth";
import { maskEmail } from "@/lib/mcp/oauth-rules";
import { MCP_OWNER_EMAIL } from "@/lib/mcp/owner";
import { AdminButton } from "@/components/admin/ui";
import { ConnectClaudeForm, ConnectionsList } from "./connect-claude";
import type { AuthorizeParams } from "./types";

export const metadata: Metadata = { title: "Свържи Claude" };
export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-2/40 p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-forest-600 text-cream">
            <Bot className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold text-ink">Claude към админа</h1>
          <p className="mt-1 text-sm text-ink-soft">Healthy &amp; Confident</p>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft">{children}</div>
      </div>
    </div>
  );
}

async function ConnectionsPage() {
  let isOwner = false;
  try {
    isOwner = (await getAdminSession())?.role === "owner";
  } catch (err) {
    if (!(err instanceof AdminSessionUnavailableError)) throw err;
  }
  if (!isOwner) {
    return (
      <Shell>
        <p className="text-sm leading-relaxed text-ink">
          Тук се виждат и откачат свързаните Claude-и. Влез като главен админ, за да ги видиш.
        </p>
        <AdminButton href="/admin/login" className="mt-5 w-full">
          Вход
        </AdminButton>
      </Shell>
    );
  }
  const connections = await listConnections();
  return (
    <Shell>
      <p className="text-sm leading-relaxed text-ink">
        За нова връзка добави в Claude конектор с адрес <code className="rounded bg-cream-2 px-1">/api/mcp</code> на
        сайта. Кодът за потвърждение идва на {maskEmail(MCP_OWNER_EMAIL)}.
      </p>
      <ConnectionsList initial={connections} />
    </Shell>
  );
}

export default async function ConnectClaudePage({ searchParams }: { searchParams: Promise<Search> }) {
  const query = await searchParams;
  if (!one(query.client_id)) return <ConnectionsPage />;

  const params: AuthorizeParams = {
    clientId: one(query.client_id),
    redirectUri: one(query.redirect_uri),
    responseType: one(query.response_type),
    codeChallenge: one(query.code_challenge),
    codeChallengeMethod: one(query.code_challenge_method),
    state: one(query.state),
  };
  const check = await validateAuthorizeRequest({
    clientId: params.clientId,
    redirectUri: params.redirectUri,
    codeChallenge: params.codeChallenge,
    codeChallengeMethod: params.codeChallengeMethod,
    responseType: params.responseType,
  });

  if (!check.ok) {
    return (
      <Shell>
        <p className="text-sm leading-relaxed text-ink">{check.message}</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <ConnectClaudeForm
        params={params}
        clientName={check.client.name || "Claude"}
        redirectHost={new URL(params.redirectUri).host}
        sendTo={maskEmail(MCP_OWNER_EMAIL)}
      />
    </Shell>
  );
}
