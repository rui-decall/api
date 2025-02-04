export interface RetellLLMDynamicVariables {
  // Add specific fields if known
  [key: string]: any;
}

export interface CallInfo {
  call_id: string;
  retell_llm_dynamic_variables: RetellLLMDynamicVariables;
  latency: Record<string, any>;
  opt_out_sensitive_data_storage: boolean;
  call_type: string;
}

export interface CalendarRequestArgs {
  query: string;
}

export interface CalendarRequest {
  call: CallInfo;
  name: string;
  args: CalendarRequestArgs;
} 