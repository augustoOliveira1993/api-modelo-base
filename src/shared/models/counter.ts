import mongoose, { Schema, Document } from 'mongoose';

interface ICounter extends Document {
  key: string; // ex: "loja:123"
  seq: number; // contador
}

const CounterSchema = new Schema<ICounter>({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.model<ICounter>('Counter', CounterSchema);
