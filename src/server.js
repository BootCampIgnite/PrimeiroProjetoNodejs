import "express-async-errors";
import express from "express";
import { v4 as uuid } from "uuid";

const app = express();
app.use(express.json());

const customers = [];

const getBalance = (statement) => {
  const reducer = (accumulator, operation) => {
    return operation.type === "credit"
      ? accumulator + operation.amount
      : accumulator - operation.amount;
  };

  return statement.reduce(reducer, 0);
};

const verifyIfAccountExists = (request, response, next) => {
  const { cpf } = request.headers;

  const customer = customers.find((element) => element.cpf === cpf);

  if (!customer) {
    return response.status(400).json({ message: "Usuário não autorizado!" });
  }

  request.customer = customer;

  return next();
};

app.post("/account", (request, response) => {
  const { cpf, name } = request.body;

  const customerExists = customers.some((element) => element.cpf === cpf);

  if (customerExists) {
    return response.status(400).json({ message: "Esse registro já existe!" });
  }

  customers.push({
    id: uuid(),
    name,
    cpf,
    statement: [],
  });

  return response.status(201).send();
});

app.use(verifyIfAccountExists);

app.put("/account", (request, response) => {
  const { name } = request.body;
  const { customer } = request;

  customer.name = name;

  return response.status(201).send();
});

app.get("/account", (request, response) => {
  const { customer } = request;
  return response.status(200).send(customer);
});

app.delete("/account", (request, response) => {
  const { customer } = request;

  customers.splice(customer, 1);

  return response.status(200).send(customers);
});

app.get("/statement", (request, response) => {
  const { customer } = request;

  const balance = getBalance(customer.statement);

  return response.status(200).json({ ...customer, balance });
});

app.post("/deposit", (request, response) => {
  const { description, amount } = request.body;
  const { customer } = request;

  customer.statement.push({
    description,
    amount,
    created_at: new Date(),
    type: "credit",
  });

  return response.status(201).send();
});

app.post("/withdraw", (request, response) => {
  const { description, amount } = request.body;
  const { customer } = request;

  const balance = getBalance(customer.statement);

  if (amount > balance) {
    return response.status(400).json({
      message: "Não foi possível realizar transação.",
      error: "Saldo insuficiente!",
      balance,
    });
  }

  customer.statement.push({
    description,
    amount,
    created_at: new Date(),
    type: "debit",
  });
  return response.status(201).send();
});

app.get("/statement/date", (request, response) => {
  const { date } = request.query;
  const { customer } = request;

  const formatedDate = new Date(date).toLocaleDateString();

  const statements = customer.statement.filter(
    (element) => element.created_at.toLocaleDateString() === formatedDate
  );

  return response.status(200).json(statements);
});

app.listen(3333, () => {
  console.log("Server On!");
});
