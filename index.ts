import { createConnection, Connection } from 'mysql2/promise';
import fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';

const app = fastify();
app.register(cors);

async function createDatabaseConnection(): Promise<Connection> { /*conexão com o banco de dados*/
    return await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'velvet'
    });
}

app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send("Servidor está rodando com sucesso!");
});

app.get('/sapatos', async (request: FastifyRequest, reply: FastifyReply) => {
    let conn: Connection | null = null;
    const { nome, preco } = request.query as {
        nome?: string;
        preco?: string;
    };

    let query = "SELECT nome, preco FROM lista WHERE 1=1";
    const values: any[] = [];

    if (nome) {
        query += " AND nome LIKE ?";
        values.push(%${nome}%);
    }

    if (preco) {
        query += " AND preco = ?";
        values.push(preco);
    }

    try {
        conn = await createDatabaseConnection();
        const [rows] = await conn.query<any>(query, values);

        if (rows.length > 0) {
            reply.status(200).send(rows);
        } else {
            reply.status(404).send({ mensagem: "Nenhum sapato encontrado!" });
        }
    } catch (erro: any) {
        console.error("Erro ao buscar sapatos:", erro);
        tratarErro(erro, reply);
    } finally {
        if (conn) await conn.end();
    }
});

function tratarErro(erro: any, reply: FastifyReply) {
    switch (erro.code) {
        case 'ECONNREFUSED':
            reply.status(400).send({ mensagem: "Erro: Banco de dados desligado!" });
            break;
        case 'ER_BAD_DB_ERROR':
            reply.status(400).send({ mensagem: "Erro: Banco 'velvet' não encontrado." });
            break;
        case 'ER_NO_SUCH_TABLE':
            reply.status(400).send({ mensagem: "Erro: Tabela 'lista' não existe no banco." });
            break;
        default:
            reply.status(500).send({ mensagem: "Erro inesperado no servidor." });
    } /*mensagens de erro*/

app.listen({ port: 8000 }, (err, address) => {
    if (err) {
        console.error("Erro ao iniciar servidor:", err);
        process.exit(1);
    }
    console.log(Servidor rodando em: ${address});
});

