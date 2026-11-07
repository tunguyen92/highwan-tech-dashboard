import { type Model, model, models, Schema, Types } from "mongoose";

interface ICounter {
  _id: string;
  seq: number;
}
const CounterSchema = new Schema<ICounter>({ _id: String, seq: { type: Number, default: 0 } });
export const Counter: Model<ICounter> = models.Counter || model<ICounter>("Counter", CounterSchema);
