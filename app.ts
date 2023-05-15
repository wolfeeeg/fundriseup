import { faker } from "@faker-js/faker";
import { Model } from "mongoose";
import { Customer } from "./models/Customer";
import { connectDB } from "./db";
import { ICustomer, CustomerSchema } from "./models/Customer";

const MIN_CUSTOMERS = 1;
const MAX_CUSTOMERS = 10;
const INSERT_INTERVAL = 200; // ms

async function insertCustomers(
  customersCollection: Model<ICustomer>
) {
  const customers = [];

  const customersCount =
    Math.floor(Math.random() * (MAX_CUSTOMERS - MIN_CUSTOMERS + 1)) +
    MIN_CUSTOMERS;

  for (let i = 0; i < customersCount; i++) {
    const customer = new customersCollection({
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      email: faker.internet.email(),
      address: {
        line1: faker.address.streetAddress(),
        line2: faker.address.secondaryAddress(),
        postcode: faker.address.zipCode(),
        city: faker.address.city(),
        state: faker.address.stateAbbr(),
        country: faker.address.countryCode(),
      },
      createdAt: new Date(),
    });

    customers.push(customer);
  }

  try {
    await Customer.insertMany(customers);
  } catch (error) {
    console.error("Failed to insert customers:", error);
  }
}

async function generateCustomers() {
  let writeConn;

  try {
    writeConn = await connectDB();
  } catch (error) {
    console.error("Error connecting to database:", error);
    return;
  }

  const customersCollection = writeConn.model<ICustomer>(
    "Customer",
    CustomerSchema
  );

  await insertCustomers(customersCollection);

  setInterval(async () => {
    await insertCustomers(customersCollection);
  }, INSERT_INTERVAL);
}

void generateCustomers();
