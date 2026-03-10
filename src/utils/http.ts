/**
 * HTTP response status code descriptions.
 */
const HTTP_STATUS_CODES: Record<string, string> = {
  "100": "Continue",
  "101": "Switching Protocols",
  "200": "OK",
  "201": "Created",
  "202": "Accepted",
  "203": "Non-Authoritative Information",
  "204": "No Content",
  "205": "Reset Content",
  "206": "Partial Content",
  "300": "Multiple Choices",
  "301": "Moved Permanently",
  "302": "Found",
  "303": "See Other",
  "304": "Not Modified",
  "307": "Temporary Redirect",
  "308": "Permanent Redirect",
  "400": "Bad Request",
  "401": "Unauthorized",
  "402": "Payment Required",
  "403": "Forbidden",
  "404": "Not Found",
  "405": "Method Not Allowed",
  "406": "Not Acceptable",
  "407": "Proxy Authentication Required",
  "408": "Request Timeout",
  "409": "Conflict",
  "410": "Gone",
  "411": "Length Required",
  "412": "Precondition Failed",
  "413": "Payload Too Large",
  "414": "URI Too Long",
  "415": "Unsupported Media Type",
  "416": "Range Not Satisfiable",
  "417": "Expectation Failed",
  "418": "I'm a Teapot",
  "422": "Unprocessable Entity",
  "429": "Too Many Requests",
  "500": "Internal Server Error",
  "501": "Not Implemented",
  "502": "Bad Gateway",
  "503": "Service Unavailable",
  "504": "Gateway Timeout",
  default: "",
};

export function httpStatusText(code: string): string {
  return HTTP_STATUS_CODES[code] ?? HTTP_STATUS_CODES["default"]!;
}

/**
 * Format a schema's numeric range constraints for display.
 * Fixes legacy bug where maximumExclusive was checked with minimumExclusive.
 */
export function schemaRange(schema: {
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number | boolean;
  exclusiveMaximum?: number | boolean;
}): string | undefined {
  const parts: string[] = [];

  if (schema.minimum !== undefined) {
    const exclusive =
      schema.exclusiveMinimum === true ||
      typeof schema.exclusiveMinimum === "number";
    const min =
      typeof schema.exclusiveMinimum === "number"
        ? schema.exclusiveMinimum
        : schema.minimum;
    parts.push(`${exclusive ? "(" : "["}${min}`);
  }

  if (schema.maximum !== undefined) {
    const exclusive =
      schema.exclusiveMaximum === true ||
      typeof schema.exclusiveMaximum === "number";
    const max =
      typeof schema.exclusiveMaximum === "number"
        ? schema.exclusiveMaximum
        : schema.maximum;
    parts.push(`${max}${exclusive ? ")" : "]"}`);
  }

  return parts.length === 2 ? parts.join(", ") : undefined;
}

/** HTTP method color classes for badges */
export function methodColor(method: string): string {
  switch (method.toLowerCase()) {
    case "get":
      return "bg-emerald-600";
    case "post":
      return "bg-blue-600";
    case "put":
      return "bg-amber-600";
    case "delete":
      return "bg-red-600";
    case "patch":
      return "bg-purple-600";
    case "options":
      return "bg-gray-500";
    case "head":
      return "bg-gray-600";
    default:
      return "bg-gray-500";
  }
}
