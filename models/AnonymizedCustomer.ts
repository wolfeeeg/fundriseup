import mongoose, { Schema } from "mongoose";
import { ICustomer } from "./Customer";

export const AnonymizedCustomerSchema = new Schema(
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
  { collection: "customers_anonymised" }
);

export const AnonymizedCustomer = mongoose.model<ICustomer>(
  "AnonymizedCustomer",
  AnonymizedCustomerSchema
);
