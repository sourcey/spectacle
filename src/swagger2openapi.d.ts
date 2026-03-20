declare module "swagger2openapi" {
  interface ConvertOptions {
    patch?: boolean;
    warnOnly?: boolean;
    direct?: boolean;
    [key: string]: unknown;
  }

  export function convertObj(
    swagger: Record<string, unknown>,
    options: ConvertOptions,
  ): Promise<Record<string, unknown>>;
}
