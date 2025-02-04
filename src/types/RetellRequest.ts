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

export class RetellRequest {
  private data: RetellRequestType

  constructor(requestBody: unknown) {
    const result = retellRequestSchema.safeParse(requestBody)
    if (!result.success) {
      throw new Error(`Invalid request format: ${JSON.stringify(result.error.format())}`)
    }
    this.data = result.data
  }

  get callId(): string {
    return this.data.call.call_id
  }

  get query(): string | undefined {
    return this.data.args?.query
  }

  get dynamicVariables(): Record<string, any> | undefined {
    return this.data.call.retell_llm_dynamic_variables
  }

  get callType(): string | undefined {
    return this.data.call.call_type
  }

  get name(): string | undefined {
    return this.data.name
  }

  get args(): Record<string, unknown> | undefined {
    return this.data.args
  }

  get rawData(): RetellRequestType {
    return this.data
  }
} 