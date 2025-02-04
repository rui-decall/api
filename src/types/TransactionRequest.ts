import { z } from 'zod';

// Base schema for common fields
const baseTransactionFields = {
  dateTime: z.string().datetime(),
  service: z.string(),
  remarks: z.string().optional(),
};

// Schema for new transactions
const newTransactionSchema = z.object({
  action: z.literal('new'),
  ...baseTransactionFields,
});

// Schema for edit transactions
const editTransactionSchema = z.object({
  action: z.literal('edit'),
  id: z.string(),
  ...baseTransactionFields,
});

// Schema for delete transactions
const deleteTransactionSchema = z.object({
  action: z.literal('delete'),
  id: z.string(),
});

// Combined schema for all transaction types
export const TransactionRequestSchema = z.object({
  instruction: z.string().describe(
    'A natural language instruction describing the action to be performed (new/edit/delete) ' +
    'and all relevant details. Must include specific date, time, service, and ID for edit/delete operations. ' +
    'Example: "Edit appointment ID ABC123 to change the haircut appointment to 2024-03-15 at 2:30pm with a note for long hair treatment"'
  ),
  transaction: z.discriminatedUnion('action', [
    newTransactionSchema,
    editTransactionSchema,
    deleteTransactionSchema,
  ]),
});

export type TransactionRequest = z.infer<typeof TransactionRequestSchema>;

// Example of valid requests:
/*
New Transaction:
{
  "instruction": "Book a new haircut appointment for 2024-03-15 at 2:30pm with a note for long hair treatment",
  "transaction": {
    "action": "new",
    "dateTime": "2024-03-15T14:30:00Z",
    "service": "haircut",
    "remarks": "long hair treatment"
  }
}

Edit Transaction:
{
  "instruction": "Change appointment ID ABC123 to 2024-03-16 at 3:30pm",
  "transaction": {
    "action": "edit",
    "id": "ABC123",
    "dateTime": "2024-03-16T15:30:00Z",
    "service": "haircut",
    "remarks": "rescheduled from previous day"
  }
}

Delete Transaction:
{
  "instruction": "Cancel appointment ID ABC123",
  "transaction": {
    "action": "delete",
    "id": "ABC123"
  }
}
*/ 