type RpcError = { code?: string; message: string } | null;

type RpcResponse = { data: unknown; error: RpcError };
type RpcClient = { rpc: (name: string, args?: Record<string, unknown>) => Promise<RpcResponse> };

export async function callRpc<T>(
  client: unknown,
  name: string,
  args: Record<string, unknown> = {}
): Promise<{ data: T | null; error: RpcError }> {
  const response = await (client as RpcClient).rpc(name, args);
  return { data: response.data as T | null, error: response.error };
}
