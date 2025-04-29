const express = require("express");
const { Client } = require("pg");

const app = express();
const PORT = 3000;

app.use(express.json());

const client = new Client({
  user: "postgres",
  host: "localhost",
  database: "dc_store_online",
  password: "30267098",
  port: 5432,
});

//conectar com o banco de dados.
client
  .connect()
  .then(async () => {
    console.log("Conectado ao PostgreSQL");

    await client.query(`
      CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      telefone VARCHAR(15)
      );
      `);

    console.log("As tabelas foram criadas");
  })
  .catch((error) => {
    console.error("Erro ao conectar com o banco:", error);
  });

app.get("/clientes", async (req, res) => {
  const result = await client.query("SELECT * FROM clientes");

  res.json(result.rows);
});

app.get("/clientes/:id", async (req, res) => {
  const ClientId = req.params.id;

  const result = await client.query("SELECT * FROM clientes WHERE id = $1", [
    ClientId,
  ]);

  res.json(result.rows[0]);
});

app.post("/clientes", async (req, res) => {
  const { nome, email, telefone } = req.body;

  try {
    await client.query(
      "INSERT INTO clientes (nome, email, telefone) VALUES ($1, $2, $3)",
      [nome, email, telefone]
    );

    res.status(201).json({ message: "Cliente criado com sucesso" });
  } catch (error) {
    console.error("Erro ao criar cliente:", error);
    res.status(500).json({ message: "Erro ao criar cliente" });
  }
});

app.put("/clientes/:id", async (req, res) => {
  const id = req.params.id;
  const { nome, email, telefone } = req.body;

  try {
    await client.query(
      "UPDATE clientes SET nome = $1, email = $2, telefone = $3 WHERE id = $4",
      [nome, email, telefone, id]
    );

    res.json({
      message: "Cliente atualizado com sucesso",
    });
  } catch (error) {
    console.error("Ocorreu um erro ao atualizar o cliente", error);
    res.status(500).json({ message: "Erro ao atualizar o cliente" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
