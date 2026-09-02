function MessengerIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M18 3C9.716 3 3 9.477 3 17.304c0 4.196 2.092 7.933 5.365 10.296V33l4.896-2.688c1.304.36 2.688.552 4.139.552 8.284 0 15-6.477 15-14.304C32.4 9.477 25.684 3 18 3z"
        fill="url(#messenger-gradient)"
      />
      <path
        d="M19.584 18.864l-2.304-2.304-4.512 2.304 4.968-5.28 2.376 2.304 4.44-2.304-4.968 5.28z"
        fill="#fff"
      />
      <defs>
        <linearGradient
          id="messenger-gradient"
          x1="3"
          y1="17.304"
          x2="32.4"
          y2="17.304"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#00B2FF" />
          <stop offset="1" stopColor="#006AFF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function MessengerWidget({
  url,
  label,
}: {
  url: string;
  label: string;
}) {
  if (!url.trim()) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="fixed bottom-6 right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-black/10 transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500"
    >
      <MessengerIcon className="h-9 w-9" />
    </a>
  );
}

export { MessengerIcon };
