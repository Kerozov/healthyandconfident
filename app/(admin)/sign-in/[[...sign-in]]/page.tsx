import { SignIn } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-center font-display text-3xl font-semibold">
          Healthy &amp; Confident
        </h1>
        <div className="flex justify-center">
          <SignIn
            forceRedirectUrl="/admin"
            appearance={{
              variables: { colorPrimary: "#f2784b" },
            }}
          />
        </div>
      </div>
    </div>
  );
}
