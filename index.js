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

      CREATE TABLE IF NOT EXISTS enderecos (
      id SERIAL PRIMARY KEY,
      cliente_id INT, 
      rua VARCHAR(100),
      cidade VARCHAR(50),
      estado VARCHAR(2),
      cep VARCHAR(9),
      CONSTRAINT fk_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE ON UPDATE CASCADE
      );
      `);

    console.log("As tabelas foram criadas");
  })
  .catch((error) => {
    console.error("Erro ao conectar com o banco:", error);
  });

// ----- CLIENTES -------
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

app.delete("/clientes/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await client.query("DELETE FROM clientes WHERE id = $1", [id]);
    res.json({ message: "Cliente Deletado" });
  } catch (error) {
    console.error("Ocorreu um erro ao deletar o cliente", error);
    res.status(500).json({ message: "Erro ao deletar o cliente" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
