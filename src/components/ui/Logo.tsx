interface LogoProps {
  href: string;
  logo?: { light?: string; dark?: string };
  name?: string;
  height?: string;
}

/**
 * Shared logo rendering — light/dark images with text fallback.
 * Used by both Header and mobile drawer.
 */
export function Logo({ href, logo, name, height = "h-7" }: LogoProps) {
  return (
    <a href={href} class="select-none inline-block">
      {logo?.light ? (
        <>
          <img
            src={logo.light}
            alt={name || "Home"}
            class={`w-auto ${height} object-contain block dark:hidden`}
          />
          <img
            src={logo.dark ?? logo.light}
            alt={name || "Home"}
            class={`w-auto ${height} object-contain hidden dark:block`}
          />
        </>
      ) : (
        <span class="text-sm font-semibold text-[rgb(var(--color-gray-900))] dark:text-[rgb(var(--color-gray-200))]">
          {name || "Docs"}
        </span>
      )}
    </a>
  );
}
