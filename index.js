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
  res.json({
    message: "Rota de clientes",
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
