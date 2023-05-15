import crypto from "crypto";
import mongoose, { Document, Model } from "mongoose";

import { AnonymizedCustomerSchema } from "./models/AnonymizedCustomer";
import { ICustomer, CustomerSchema } from "./models/Customer";
import { connectDB } from "./db";

let docQueue: ICustomer[] = [];
let timeoutId: NodeJS.Timeout | null = null;

interface ChangeEvent<T extends Document> {
  operationType: string;
  fullDocument: T;
  documentKey: {
    _id: mongoose.Types.ObjectId;
  };
}

async function anonymizeField(value: string): Promise<string> {
  return crypto.createHash("md5").update(value).digest("hex");
}

async function anonymizeAndCopy(
  anonymizedCollection: Model<ICustomer>,
  doc: ICustomer
): Promise<void> {
  const [emailFirst, emailLast] = doc.email.split("@");

  const anonymizedCustomer = new anonymizedCollection({
    ...doc,
    firstName: await anonymizeField(doc.firstName),
    lastName: await anonymizeField(doc.lastName),
    email: `${await anonymizeField(emailFirst)}@${emailLast}`,
    address: {
      ...doc.address,
      line1: await anonymizeField(doc.address.line1),
      line2: await anonymizeField(doc.address.line2),
      postcode: await anonymizeField(doc.address.postcode),
    },
  });

  await anonymizedCustomer.save();
}

async function anonymizeAndInsertBatch(
  anonymizedCollection: Model<ICustomer>,
  batch: ICustomer[]
) {
  try {
    // Anonymize each document and add to AnonymizedCustomer
    for (const doc of batch) {
      await anonymizeAndCopy(anonymizedCollection, doc);
    }
  } catch (error) {
    console.error("Error during batch insert:", error);
  }
}

async function realtimeSync(
  customersCollection: Model<ICustomer>,
  anonymizedCollection: Model<ICustomer>
): Promise<void> {
  const changeStream = customersCollection.watch([], {
    fullDocument: "updateLookup",
  });

  changeStream.on("change", (change: ChangeEvent<Document>) => {
    if (change.operationType === "insert") {
      const doc = change.fullDocument as ICustomer;

      docQueue.push(doc);

      // If queue length has reached 1000, anonymize and insert documents
      if (docQueue.length === 1000) {
        if (timeoutId) clearTimeout(timeoutId);
        anonymizeAndInsertBatch(anonymizedCollection, docQueue);
        docQueue = [];
      }
      // If queue length is less than 1000, set up timeout to process queue after 1 second
      else if (!timeoutId) {
        timeoutId = setTimeout(() => {
          anonymizeAndInsertBatch(anonymizedCollection, docQueue);
          docQueue = [];
          timeoutId = null;
        }, 1000);
      }
    }
  });

  changeStream.on("error", (error) => {
    console.error("Error in change stream", error);
  });
}

async function fullReindex(
  customersCollection: Model<ICustomer>,
  anonymizedCollection: Model<ICustomer>
): Promise<void> {
  await anonymizedCollection.deleteMany({}).exec();

  const docs = await customersCollection.find().exec();
  for (const doc of docs) {
    await anonymizeAndCopy(anonymizedCollection, doc);
  }
}

async function start() {
  let readConn, writeConn;

  try {
    readConn = await connectDB("nearest");
    writeConn = await connectDB("primary");
  } catch (error) {
    console.error("Error connecting to database:", error);
    return;
  }

  const customersCollection = readConn.model<ICustomer>(
    "Customer",
    CustomerSchema
  );
  const anonymizedCollection = writeConn.model<ICustomer>(
    "AnonymizedCustomer",
    AnonymizedCustomerSchema
  );

  if (process.argv.includes("--full-reindex")) {
    await fullReindex(customersCollection, anonymizedCollection);
    process.exit(0);
  } else {
    await realtimeSync(customersCollection, anonymizedCollection);
  }
}

start();
