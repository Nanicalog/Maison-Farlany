import mysql, { Connection } from 'mysql2/promise';
import fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';

// Inicializa o servidor Fastify
const app = fastify();
// Registra o plugin CORS para permitir requisições de outras origens
app.register(cors);

// Função para criar uma conexão com o banco de dados 
async function createDatabaseConnection(): Promise<Connection> {
    return await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'sapatos'
    });
}
// Rota para buscar todos os sapatos cadastrados no banco
app.get('/sapatos', async (request: FastifyRequest, reply: FastifyReply) => {
    let conn: Connection | null = null;

    try {
        // Cria a conexão com o banco
        conn = await createDatabaseConnection();

        // Executa a consulta SQL para listar os sapatos (atenção ao nome da tabela e da query)
        const [rows] = await conn.query<any>("SELECT * lista");

        // Retorna os resultados para o cliente
        reply.status(200).send(rows);

    } catch (erro: any) {
        console.error("Erro ao listar produto:", erro);

        // Tratamento de erros específicos do MySQL para mensagens amigáveis
        if (erro.code === 'ECONNREFUSED') {
            reply.status(400).send({ mensagem: "ERRO: LIGUE O LARAGAO => Conexão Recusada" });
        } else if (erro.code === 'ER_BAD_DB_ERROR') {
            reply.status(400).send({ mensagem: "ERRO: CRIE UM BANCO DE DADOS COM O NOME DEFINIDO NA CONEXÃO" });
        } else if (erro.code === 'ER_ACCESS_DENIED_ERROR') {
            reply.status(400).send({ mensagem: "ERRO: CONFERIR O USUÁRIO E SENHA DEFINIDOS NA CONEXÃO" });
        } else if (erro.code === 'ER_NO_SUCH_TABLE') {
            reply.status(400).send({ mensagem: "ERRO: Você deve criar a tabela com o mesmo nome da sua QUERY" });
        } else if (erro.code === 'ER_PARSE_ERROR') {
            reply.status(400).send({ mensagem: "ERRO: Você tem um erro de escrita em sua QUERY confira: VÍRGULAS, PARENTESES E NOME DE COLUNAS" });
        } else {
            reply.status(500).send({ mensagem: "ERRO: NÃO IDENTIFICADO" }); // Erro genérico
        }
    } finally {
        // Fecha a conexão com o banco, se aberta
        if (conn) {
            await conn.end();
        }
    }
});

// Rota para buscar sapatos por nome e/ou preço
app.get('/Sapatos', async (request: FastifyRequest, reply: FastifyReply) => {
    let conn: Connection | null = null;

    // Pega os parâmetros da query string
    const { nome, preco } = request.query as { nome?: string; preco?: string };

    // Se nenhum parâmetro for passado, retorna erro
    if (!nome && !preco) {
        return reply.status(400).send({ mensagem: "Por favor, forneça o nome ou o preço do sapato para buscar." });
    }

    // Monta a query inicial, usando "WHERE 1=1" para facilitar concatenação condicional
    let query = "SELECT * FROM sapatos_db WHERE 1=1";
    const values: any[] = [];

    // Se nome foi passado, adiciona na query com LIKE para busca parcial
    if (nome) {
        query += " AND nome LIKE ?";
        values.push(`%${nome}%`);
    }

    // Se preco foi passado, adiciona na query para busca exata no preço
    if (preco) {
        query += " AND preco = ?";
        values.push(preco);
    }

    try {
        // Cria conexão com o banco
        conn = await createDatabaseConnection();

        // Executa a query parametrizada
        const [rows] = await conn.query<any>(query, values);

        if (rows.length > 0) {
            // Retorna os resultados encontrados
            reply.status(200).send(rows);
        } else {
            // Caso nenhum resultado encontrado, informa ao cliente
            reply.status(404).send({ mensagem: "ESSE PRODUTO NÃO EXISTE" });
        }
    } catch (erro: any) {
        console.error("Erro ao buscar sapato por nome e preco:", erro);

        // Tratamento de erros MySQL para mensagens amigáveis
        if (erro.code === 'ECONNREFUSED') {
            reply.status(400).send({ mensagem: "ERRO: LIGUE O LARAGAO => Conexão Recusada" });
        } else if (erro.code === 'ER_BAD_DB_ERROR') {
            reply.status(400).send({ mensagem: "ERRO: CRIE UM BANCO DE DADOS COM O NOME DEFINIDO NA CONEXÃO" });
        } else if (erro.code === 'ER_ACCESS_DENIED_ERROR') {
            reply.status(400).send({ mensagem: "ERRO: CONFERIR O USUÁRIO E SENHA DEFINIDOS NA CONEXÃO" });
        } else if (erro.code === 'ER_NO_SUCH_TABLE') {
            reply.status(400).send({ mensagem: "ERRO: Você deve criar a tabela com o mesmo nome da sua QUERY" });
        } else if (erro.code === 'ER_PARSE_ERROR') {
            reply.status(400).send({ mensagem: "ERRO: Você tem um erro de escrita em sua QUERY confira: VÍRGULAS, PARENTESES E NOME DE COLUNAS" });
        } else {
            reply.status(500).send({ mensagem: "Erro interno no servidor ao buscar o sapato." });
        }
    } finally {
        // Fecha a conexão com o banco
        if (conn) {
            await conn.end();
        }
    }
});

// Inicializa o servidor Fastify na porta 8000
app.listen({ port: 8000 }, (err, address) => {
    if (err) {
        console.error("Erro ao iniciar servidor:", err);
        process.exit(1); // Sai do processo em caso de erro
    }
    console.log(`Servidor ouvindo em ${address}`);
});
