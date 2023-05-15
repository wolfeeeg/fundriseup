import mongoose, { Document, Schema } from "mongoose";

interface IAddress {
  line1: string;
  line2: string;
  postcode: string;
  city: string;
  state: string;
  country: string;
}

export interface ICustomer extends Document {
  firstName: string;
  lastName: string;
  email: string;
  address: IAddress;
  createdAt: Date;
}

export const CustomerSchema = new Schema(
  {
    firstName: String,
    lastName: String,
    email: String,
    address: {
      line1: String,
      line2: String,
      postcode: String,
      city: String,
      state: String,
      country: String,
    },
    createdAt: Date,
  },
  { collection: "customers" }
);

export const Customer = mongoose.model<ICustomer>("Customer", CustomerSchema);
