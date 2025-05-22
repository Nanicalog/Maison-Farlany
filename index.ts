import mysql, { Connection } from 'mysql2/promise';
import fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';

const app = fastify();
app.register(cors);

// Criar uma conexão com o banco de dados
async function createDatabaseConnection(): Promise<Connection> {
    return await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'sapatos_db'
    });
}

// Método POST para adicionar um novo sapato
app.post('/sapatos', async (request: FastifyRequest, reply: FastifyReply) => {
    let conn: Connection | null = null;
    const { nome, preco } = request.body as { nome?: string; preco?: number };

    // Verificar se os dados foram fornecidos
    if (!nome || !preco) {
        return reply.status(400).send({ mensagem: "Nome e preço do sapato são obrigatórios!" });
    }

    try {
        conn = await createDatabaseConnection();
        await conn.query("INSERT INTO sapatos (nome, preco) VALUES (?, ?)", [nome, preco]);

        reply.status(201).send({ mensagem: "Sapato adicionado com sucesso!" });
    } catch (erro: any) {
        console.error("Erro ao adicionar sapato:", erro);

        reply.status(500).send({ mensagem: "Erro interno ao adicionar o sapato." });
    } finally {
        if (conn) {
            await conn.end(); // Fechar a conexão após a inserção
        }
    }
});

// Inicializando o servidor
app.listen({ port: 8000 }, (err, address) => {
    if (err) {
        console.error("Erro ao iniciar servidor:", err);
        process.exit(1);
    }
    console.log(`Servidor ouvindo em ${address}`);
});
