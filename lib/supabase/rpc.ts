type RpcError = {
  code?: string;
  message: string;
} | null;

type RpcResponse = {
  data: unknown;
  error: RpcError;
};

type RpcClient = {
  rpc: (functionName: string, args?: Record<string, unknown>) => Promise<RpcResponse>;
};

/**
 * Calls newly added database functions without weakening the generated Supabase
 * types used by the rest of the application. Regenerate database types after
 * applying the migrations to remove the adapter when convenient.
 */
export async function callRpc<T>(
  client: unknown,
  functionName: string,
  args: Record<string, unknown> = {}
): Promise<{ data: T | null; error: RpcError }> {
  const response = await (client as RpcClient).rpc(functionName, args);
  return {
    data: response.data as T | null,
    error: response.error
  };
}
