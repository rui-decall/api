import { z } from 'zod'

export const retellRequestSchema = z.object({
  call: z.object({
    call_id: z.string(),
    retell_llm_dynamic_variables: z.record(z.any()).optional(),
    latency: z.record(z.any()).optional(),
    opt_out_sensitive_data_storage: z.boolean().optional(),
    call_type: z.string().optional()
  }),
  name: z.string().optional(),
  args: z.object({
    query: z.string().optional(),
    // Add other possible args here
    // [k: string]: unknown
  }).optional()
})

export type RetellRequestType = z.infer<typeof retellRequestSchema>

interface Call {
  call_id: string;
  retell_llm_dynamic_variables?: Record<string, any>;
  latency?: Record<string, any>;
  opt_out_sensitive_data_storage?: boolean;
  call_type?: string;
}

interface TransactionArgs {
  transaction: {
    query: string;
    execution_message: string;
  }
}

export class RetellRequest {
  callId: string;
  dynamicVariables?: Record<string, any>;
  query?: string;
  callType?: string;
  name?: string;
  args?: TransactionArgs | Record<string, any>;

  constructor(body: {
    call: Call;
    name?: string;
    args?: TransactionArgs | Record<string, any>;
  }) {
    if (!body.call?.call_id) {
      throw new Error('Call ID is required');
    }

    this.callId = body.call.call_id;
    this.dynamicVariables = body.call.retell_llm_dynamic_variables;
    this.callType = body.call.call_type;
    this.name = body.name;
    this.args = body.args;
  }

  getTransactionDetails(): { query: string; executionMessage: string } | null {
    if (this.args && 'transaction' in this.args) {
      return {
        query: this.args.transaction.query,
        executionMessage: this.args.transaction.execution_message
      };
    }
    return null;
  }
} 