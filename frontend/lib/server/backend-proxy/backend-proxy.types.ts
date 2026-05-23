import type { NextResponse } from "next/server";

export type BackendProxyUser = {
    id: string;
    email?: string | null;
    role?: string | null;
};

export type BackendProxyAuthHeaders = {
    Authorization: string;
};

export type BackendProxyResult<T> =
    | {
          ok: true;
          value: T;
      }
    | {
          ok: false;
          response: NextResponse;
      };
