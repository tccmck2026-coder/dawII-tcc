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
  envolvidos: "",
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
        <button type="button" key={item.valor} className={`${styles.pill} ${selecionado === item.valor ? styles[item.classe] : ""}`} onClick={() => onSelecionar(item.valor)}>
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
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  function alterarCampo(campo, valor) {
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  }

  useEffect(() => {
    async function buscarOcorrencia() {
      if (!ocorrenciaId) return;

      setCarregando(true);
      setMensagem(null);

      const { data: ocorrencia, error } = await supabase.from("ocorrencia").select("*").eq("id", ocorrenciaId).single();

      if (error) {
        setMensagem({ tipo: "erro", texto: "Erro ao buscar ocorrência: " + error.message });
        setCarregando(false);
        return;
      }

      setFormulario({
        data: ocorrencia.data?.split("T")[0] || "",
        nivel: ocorrencia.nivel || "Leve",
        status: ocorrencia.status || "Em andamento",
        categorias: parseCategorias(ocorrencia.categorias),
        envolvidos: ocorrencia.envolvidos || "",
        descricao: ocorrencia.descricao || "",
        providencias: ocorrencia.providencias || "",
      });
      setCarregando(false);
    }
    buscarOcorrencia();
  }, [ocorrenciaId]);

  function adicionarCategoria() {
    const categoria = novaCategoria.trim();

    if (categoria && !formulario.categorias.includes(categoria)) {
      alterarCampo("categorias", [...formulario.categorias, categoria]);
    }
    setNovaCategoria("");
  }

  function removerCategoria(categoriaRemovida) {
    alterarCampo("categorias", formulario.categorias.filter((categoria) => categoria !== categoriaRemovida));
  }

  function limparFormulario() {
    setFormulario({ ...FORMULARIO_INICIAL });
    setNovaCategoria("");
  }

  function cancelar() {
    if (modoEdicao) {
      router.push("/ocorrencias");
      return;
    }

    limparFormulario();
    setMensagem(null);
  }

  async function handleSalvar() {
    setMensagem(null);

    if (!formulario.data || !formulario.descricao.trim()) {
      setMensagem({ tipo: "erro", texto: "Preencha ao menos a data e a descrição." });
      return;
    }
    setEnviando(true);

    const dados = {
      ...formulario,
      envolvidos: formulario.envolvidos.trim(),
      descricao: formulario.descricao.trim(),
      providencias: formulario.providencias.trim(),
    };

    const resultado = modoEdicao
      ? await supabase.from("ocorrencia").update(dados).eq("id", ocorrenciaId)
      : await supabase.from("ocorrencia").insert([dados]);

    setEnviando(false);

    if (resultado.error) {
      const texto = modoEdicao ? "Erro ao salvar alterações: " : "Erro ao registrar: ";
      setMensagem({ tipo: "erro", texto: texto + resultado.error.message });
      return;
    }

    if (modoEdicao) {
      router.push("/ocorrencias");
      return;
    }

    limparFormulario();
    setMensagem({ tipo: "sucesso", texto: "Ocorrência registrada com sucesso!" });
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <header className={styles.header}>
          <button type="button" className={styles.backButton} aria-label="Voltar" onClick={() => router.back()}>←</button>

          <div className={styles.headerTextos}>
            <h1>{modoEdicao ? "Editar Ocorrência" : "Registrar Ocorrência"}</h1>
            <p>{modoEdicao ? "Altere as informações abaixo" : "Preencha as informações abaixo"}</p>
          </div>

          {modoEdicao ? <span className={styles.editandoBadge}>Editando</span> : <span className={styles.headerSpacer} />}
        </header>

        <div className={styles.body}>
          {carregando ? (
            <p className={styles.carregando}>Carregando ocorrência...</p>
          ) : (
            <>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label>Data da ocorrência</label>
                  <input type="date" value={formulario.data} onChange={(event) => alterarCampo("data", event.target.value)} />
                </div>

                <div className={styles.field}>
                  <label>Nível da ocorrência</label>
                  <GrupoOpcoes opcoes={NIVEIS} selecionado={formulario.nivel} onSelecionar={(valor) => alterarCampo("nivel", valor)} />
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label>Status da ocorrência</label>
                  <GrupoOpcoes opcoes={STATUS} selecionado={formulario.status} onSelecionar={(valor) => alterarCampo("status", valor)} />
                </div>

                <div className={styles.field}>
                  <label>Categoria da ocorrência</label>

                  <div className={styles.tagInputWrapper}>
                    {formulario.categorias.map((categoria, index) => {
                      const texto = typeof categoria === "object" ? categoria.valor : categoria;
                      if (!texto) return null;

                      return (
                        <span key={`${texto}-${index}`} className={styles.tag}>
                          {texto}
                          <button type="button" aria-label={`Remover ${texto}`} onClick={() => removerCategoria(categoria)}>×</button>
                        </span>
                      );
                    })}

                    <input
                      className={styles.tagInput}
                      placeholder="Adicionar categoria..."
                      value={novaCategoria}
                      onChange={(event) => setNovaCategoria(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          adicionarCategoria();
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.field}>
                <label>Envolvidos</label>
                <input type="text" placeholder="Selecione" value={formulario.envolvidos} onChange={(event) => alterarCampo("envolvidos", event.target.value)} />
              </div>

              <div className={styles.field}>
                <label>Descrição da ocorrência</label>
                <textarea rows={3} placeholder="Descreva o que aconteceu..." value={formulario.descricao} onChange={(event) => alterarCampo("descricao", event.target.value)} />
              </div>

              <div className={styles.field}>
                <label>Providências</label>
                <textarea rows={3} placeholder="Qual providência será tomada?" value={formulario.providencias} onChange={(event) => alterarCampo("providencias", event.target.value)} />
              </div>

              {mensagem && <p className={mensagem.tipo === "erro" ? styles.erro : styles.sucesso}>{mensagem.texto}</p>}

              <div className={styles.actions}>
                <button type="button" className={styles.cancelar} onClick={cancelar} disabled={enviando}>Cancelar</button>

                <button type="button" className={styles.registrar} onClick={handleSalvar} disabled={enviando}>
                  {enviando ? (modoEdicao ? "Salvando..." : "Registrando...") : modoEdicao ? "Salvar alterações" : "Registrar"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}