/** Параметрите, с които Claude отваря страницата за разрешение (OAuth 2.1). */
export type AuthorizeParams = {
  clientId: string;
  redirectUri: string;
  responseType: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state: string;
};
