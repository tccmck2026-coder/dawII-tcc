"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import styles from "./page.module.css";

const NIVEIS = [
  { valor: "Leve", classe: "pillNivelLeve" },
  { valor: "Grave", classe: "pillNivelGrave" },
  { valor: "Gravissimo", classe: "pillNivelGravissimo" },
];

const STATUS = [
  { valor: "Em andamento", classe: "pillStatusAndamento" },
  { valor: "Finalizado", classe: "pillStatusFinalizado" },
  { valor: "Cancelado", classe: "pillStatusCancelado" },
];

const FORMULARIO_INICIAL = {
  data: "",
  nivel: "Leve",
  status: "Em andamento",
  categorias: [],
  envolvidos: [],
  descricao: "",
  providencias: "",
};

function parseCategorias(categorias) {
  if (!categorias) return [];
  if (Array.isArray(categorias)) return categorias;

  try {
    const resultado = JSON.parse(categorias);
    return Array.isArray(resultado) ? resultado : [resultado];
  } catch {
    return [categorias];
  }
}

function GrupoOpcoes({ opcoes, selecionado, onSelecionar }) {
  return (
    <div className={styles.pillGroup}>
      {opcoes.map((item) => (
        <button
          type="button"
          key={item.valor}
          className={`${styles.pill} ${
            selecionado === item.valor ? styles[item.classe] : ""
          }`}
          onClick={() => onSelecionar(item.valor)}
        >
          {item.valor}
        </button>
      ))}
    </div>
  );
}

export default function RegistrarOcorrencia() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const ocorrenciaId = searchParams.get("id");
  const modoEdicao = Boolean(ocorrenciaId);

  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [novaCategoria, setNovaCategoria] = useState("");
  const [buscaEnvolvido, setBuscaEnvolvido] = useState("");
  const [resultadosEnvolvidos, setResultadosEnvolvidos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  function alterarCampo(campo, valor) {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  async function buscarEnvolvidos(valor) {
    setBuscaEnvolvido(valor);

    const matricula = valor.trim();

    if (!matricula) {
      setResultadosEnvolvidos([]);
      return;
    }

    const { data, error } = await supabase
      .from("envolvido")
      .select("id, nome, matricula, tipo")
      .ilike("matricula", `%${matricula}%`)
      .limit(6);

    if (error) {
      console.error("Erro ao buscar envolvidos:", error);
      setResultadosEnvolvidos([]);
      return;
    }

    setResultadosEnvolvidos(data || []);
  }

  function adicionarEnvolvido(envolvido) {
    const existe = formulario.envolvidos.some(
      (item) => item.id === envolvido.id
    );

    if (!existe) {
      alterarCampo("envolvidos", [
        ...formulario.envolvidos,
        envolvido,
      ]);
    }

    setBuscaEnvolvido("");
    setResultadosEnvolvidos([]);
  }

  function removerEnvolvido(id) {
    alterarCampo(
      "envolvidos",
      formulario.envolvidos.filter((item) => item.id !== id)
    );
  }

  useEffect(() => {
    async function buscarOcorrencia() {
      if (!ocorrenciaId) return;

      setCarregando(true);
      setMensagem(null);

      const { data: ocorrencia, error } = await supabase
        .from("ocorrencia")
        .select("*")
        .eq("id", ocorrenciaId)
        .single();

      if (error) {
        setMensagem({
          tipo: "erro",
          texto: "Erro ao buscar ocorrência: " + error.message,
        });

        setCarregando(false);
        return;
      }

      const { data: vinculos, error: erroEnvolvidos } = await supabase
        .from("ocorrencia_envolvido")
        .select(`
          envolvido (
            id,
            nome,
            matricula,
            tipo
          )
        `)
        .eq("ocorrencia_id", ocorrenciaId);

      if (erroEnvolvidos) {
        setMensagem({
          tipo: "erro",
          texto: "Erro ao buscar envolvidos: " + erroEnvolvidos.message,
        });

        setCarregando(false);
        return;
      }

      const envolvidos = (vinculos || [])
        .map((item) => item.envolvido)
        .filter(Boolean);

      setFormulario({
        data: ocorrencia.data?.split("T")[0] || "",
        nivel: ocorrencia.nivel || "Leve",
        status: ocorrencia.status || "Em andamento",
        categorias: parseCategorias(ocorrencia.categorias),
        envolvidos,
        descricao: ocorrencia.descricao || "",
        providencias: ocorrencia.providencias || "",
      });

      setCarregando(false);
    }

    buscarOcorrencia();
  }, [ocorrenciaId]);

  function adicionarCategoria() {
    const categoria = novaCategoria.trim();

    if (
      categoria &&
      !formulario.categorias.some(
        (item) => String(item).toLowerCase() === categoria.toLowerCase()
      )
    ) {
      alterarCampo("categorias", [
        ...formulario.categorias,
        categoria,
      ]);
    }

    setNovaCategoria("");
  }

  function removerCategoria(categoriaRemovida) {
    alterarCampo(
      "categorias",
      formulario.categorias.filter(
        (categoria) => categoria !== categoriaRemovida
      )
    );
  }

  function limparFormulario() {
    setFormulario({ ...FORMULARIO_INICIAL });
    setNovaCategoria("");
    setBuscaEnvolvido("");
    setResultadosEnvolvidos([]);
  }

  function cancelar() {
    if (modoEdicao) {
      router.push("/ocorrencias");
      return;
    }

    limparFormulario();
    setMensagem(null);
  }

  async function salvarVinculos(idOcorrencia) {
    if (modoEdicao) {
      const { error } = await supabase
        .from("ocorrencia_envolvido")
        .delete()
        .eq("ocorrencia_id", idOcorrencia);

      if (error) return error;
    }

    if (!formulario.envolvidos.length) return null;

    const vinculos = formulario.envolvidos.map((envolvido) => ({
      ocorrencia_id: idOcorrencia,
      envolvido_id: envolvido.id,
    }));

    const { error } = await supabase
      .from("ocorrencia_envolvido")
      .insert(vinculos);

    return error;
  }

  async function handleSalvar() {
    setMensagem(null);

    if (!formulario.data || !formulario.descricao.trim()) {
      setMensagem({
        tipo: "erro",
        texto: "Preencha ao menos a data e a descrição.",
      });
      return;
    }

    setEnviando(true);

    const dados = {
      data: formulario.data,
      nivel: formulario.nivel,
      status: formulario.status,
      categorias: formulario.categorias,
      descricao: formulario.descricao.trim(),
      providencias: formulario.providencias.trim(),
    };

    let idOcorrencia = ocorrenciaId;

    if (modoEdicao) {
      const { error } = await supabase
        .from("ocorrencia")
        .update(dados)
        .eq("id", ocorrenciaId);

      if (error) {
        setEnviando(false);
        setMensagem({
          tipo: "erro",
          texto: "Erro ao salvar alterações: " + error.message,
        });
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("ocorrencia")
        .insert([dados])
        .select("id")
        .single();

      if (error) {
        setEnviando(false);
        setMensagem({
          tipo: "erro",
          texto: "Erro ao registrar ocorrência: " + error.message,
        });
        return;
      }

      idOcorrencia = data.id;
    }

    const erroVinculos = await salvarVinculos(idOcorrencia);

    if (erroVinculos) {
      setEnviando(false);
      setMensagem({
        tipo: "erro",
        texto: "Erro ao salvar envolvidos: " + erroVinculos.message,
      });
      return;
    }

    setEnviando(false);

    if (modoEdicao) {
      router.push("/ocorrencias");
      return;
    }

    limparFormulario();

    setMensagem({
      tipo: "sucesso",
      texto: "Ocorrência registrada com sucesso!",
    });
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <header className={styles.header}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => router.back()}
          >
            ←
          </button>

          <div className={styles.headerTextos}>
            <h1>
              {modoEdicao
                ? "Editar Ocorrência"
                : "Registrar Ocorrência"}
            </h1>

            <p>
              {modoEdicao
                ? "Altere as informações abaixo"
                : "Preencha as informações abaixo"}
            </p>
          </div>

          {modoEdicao ? (
            <span className={styles.editandoBadge}>Editando</span>
          ) : (
            <span className={styles.headerSpacer} />
          )}
        </header>

        <div className={styles.body}>
          {carregando ? (
            <p className={styles.carregando}>
              Carregando ocorrência...
            </p>
          ) : (
            <>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label>Data da ocorrência</label>

                  <input
                    type="date"
                    value={formulario.data}
                    onChange={(e) =>
                      alterarCampo("data", e.target.value)
                    }
                  />
                </div>

                <div className={styles.field}>
                  <label>Nível da ocorrência</label>

                  <GrupoOpcoes
                    opcoes={NIVEIS}
                    selecionado={formulario.nivel}
                    onSelecionar={(valor) =>
                      alterarCampo("nivel", valor)
                    }
                  />
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label>Status da ocorrência</label>

                  <GrupoOpcoes
                    opcoes={STATUS}
                    selecionado={formulario.status}
                    onSelecionar={(valor) =>
                      alterarCampo("status", valor)
                    }
                  />
                </div>

                <div className={styles.field}>
                  <label>Categoria da ocorrência</label>

                  <div className={styles.tagInputWrapper}>
                    {formulario.categorias.map((categoria, index) => (
                      <span
                        key={`${categoria}-${index}`}
                        className={styles.tag}
                      >
                        {categoria}

                        <button
                          type="button"
                          onClick={() =>
                            removerCategoria(categoria)
                          }
                        >
                          ×
                        </button>
                      </span>
                    ))}

                    <input
                      className={styles.tagInput}
                      placeholder="Adicionar categoria..."
                      value={novaCategoria}
                      onChange={(e) =>
                        setNovaCategoria(e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          adicionarCategoria();
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.field}>
                <label>Envolvidos</label>

                <div className={styles.envolvidosContainer}>
                  <div className={styles.tagInputWrapper}>
                    {formulario.envolvidos.map((envolvido) => (
                      <span
                        key={envolvido.id}
                        className={styles.tag}
                      >
                        {envolvido.nome}

                        <button
                          type="button"
                          onClick={() =>
                            removerEnvolvido(envolvido.id)
                          }
                        >
                          ×
                        </button>
                      </span>
                    ))}

                    <input
                      className={styles.tagInput}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="Adicionar envolvido..."
                      value={buscaEnvolvido}
                      onChange={(e) =>
                        buscarEnvolvidos(e.target.value)
                      }
                    />
                  </div>

                  {resultadosEnvolvidos.length > 0 && (
                    <div className={styles.listaEnvolvidos}>
                      {resultadosEnvolvidos.map((envolvido) => (
                        <button
                          key={envolvido.id}
                          type="button"
                          className={styles.opcaoEnvolvido}
                          onClick={() =>
                            adicionarEnvolvido(envolvido)
                          }
                        >
                          <strong>{envolvido.nome}</strong>
                          <span>{envolvido.matricula}</span>
                          <span>{envolvido.tipo}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.field}>
                <label>Descrição da ocorrência</label>

                <textarea
                  rows={3}
                  placeholder="Descreva o que aconteceu..."
                  value={formulario.descricao}
                  onChange={(e) =>
                    alterarCampo("descricao", e.target.value)
                  }
                />
              </div>

              <div className={styles.field}>
                <label>Providências</label>

                <textarea
                  rows={3}
                  placeholder="Qual providência será tomada?"
                  value={formulario.providencias}
                  onChange={(e) =>
                    alterarCampo("providencias", e.target.value)
                  }
                />
              </div>

              {mensagem && (
                <p
                  className={
                    mensagem.tipo === "erro"
                      ? styles.erro
                      : styles.sucesso
                  }
                >
                  {mensagem.texto}
                </p>
              )}

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.cancelar}
                  onClick={cancelar}
                  disabled={enviando}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className={styles.registrar}
                  onClick={handleSalvar}
                  disabled={enviando}
                >
                  {enviando
                    ? modoEdicao
                      ? "Salvando..."
                      : "Registrando..."
                    : modoEdicao
                      ? "Salvar alterações"
                      : "Registrar"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}