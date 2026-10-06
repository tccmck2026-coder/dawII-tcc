"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import styles from "./page.module.css";

const NIVEL_CLASSE = {
  Leve: "pillNivelLeve",
  Grave: "pillNivelGrave",
  Gravissimo: "pillNivelGravissimo",
};

const STATUS_CLASSE = {
  "Em andamento": "dotAndamento",
  Finalizado: "dotFinalizado",
  Cancelado: "dotCancelado",
};

function formatarData(data) {
  if (!data) return "";

  return new Date(`${data.split("T")[0]}T12:00:00`)
    .toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    })
    .replace(".", "");
}

function parseCategorias(categorias) {
  if (Array.isArray(categorias)) return categorias;
  if (!categorias) return [];

  try {
    const resultado = JSON.parse(categorias);
    return Array.isArray(resultado) ? resultado : [resultado];
  } catch {
    return [categorias];
  }
}

function IconeEnvolvidos() {
  return (
    <svg
      className={styles.iconeEnvolvidos}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export default function Ocorrencias() {
  const router = useRouter();

  const [ocorrencias, setOcorrencias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [menuAberto, setMenuAberto] = useState(null);

  useEffect(() => {
    async function buscarOcorrencias() {
      const { data, error } = await supabase
        .from("ocorrencia")
        .select(`
          *,
          ocorrencia_envolvido (
            envolvido (
              id,
              nome,
              matricula,
              tipo
            )
          )
        `)
        .order("data", { ascending: false });

      if (error) {
        setErro(error.message);
      } else {
        setOcorrencias(data || []);
      }

      setCarregando(false);
    }

    buscarOcorrencias();
  }, []);

  async function excluirOcorrencia(id) {
    if (!window.confirm("Deseja excluir esta ocorrência?")) return;

    setMenuAberto(null);

    const { error } = await supabase
      .from("ocorrencia")
      .delete()
      .eq("id", id);

    if (error) {
      alert(`Erro ao excluir: ${error.message}`);
      return;
    }

    setOcorrencias((lista) =>
      lista.filter((ocorrencia) => ocorrencia.id !== id)
    );
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <header className={styles.header}>
          <Link
            href="/"
            className={styles.backButton}
            aria-label="Voltar"
          >
            ←
          </Link>

          <h1>Ocorrências</h1>

          <span className={styles.headerSpacer} />
        </header>

        <main className={styles.body}>
          {carregando && (
            <p className={styles.estado}>Carregando...</p>
          )}

          {erro && (
            <p className={styles.estadoErro}>
              Erro ao carregar: {erro}
            </p>
          )}

          {!carregando && !erro && ocorrencias.length === 0 && (
            <p className={styles.estado}>
              Nenhuma ocorrência registrada.
            </p>
          )}

          {!carregando &&
            !erro &&
            ocorrencias.map((ocorrencia) => {
              const categorias = parseCategorias(
                ocorrencia.categorias
              );

              const envolvidos = (
                ocorrencia.ocorrencia_envolvido || []
              )
                .map((item) => item.envolvido)
                .filter(Boolean);

              return (
                <article
                  key={ocorrencia.id}
                  className={styles.ocorrenciaCard}
                >
                  <div className={styles.topo}>
                    <div className={styles.tags}>
                      <span
                        className={`${styles.pillNivel} ${
                          styles[
                            NIVEL_CLASSE[ocorrencia.nivel]
                          ] || ""
                        }`}
                      >
                        {ocorrencia.nivel}
                      </span>

                      {categorias.map((categoria, index) => {
                        const texto =
                          typeof categoria === "object"
                            ? categoria.valor
                            : categoria;

                        return texto ? (
                          <span
                            key={`${texto}-${index}`}
                            className={styles.pillCategoria}
                          >
                            {texto}
                          </span>
                        ) : null;
                      })}
                    </div>

                    <div className={styles.statusWrapper}>
                      <span
                        className={`${styles.dot} ${
                          styles[
                            STATUS_CLASSE[ocorrencia.status]
                          ] || ""
                        }`}
                      />

                      <span className={styles.statusTexto}>
                        {ocorrencia.status}
                      </span>

                      <div className={styles.menuWrapper}>
                        <button
                          type="button"
                          className={styles.menu}
                          onClick={() =>
                            setMenuAberto(
                              menuAberto === ocorrencia.id
                                ? null
                                : ocorrencia.id
                            )
                          }
                        >
                          ⋮
                        </button>

                        {menuAberto === ocorrencia.id && (
                          <div className={styles.menuDropdown}>
                            <button
                              type="button"
                              className={styles.menuEditar}
                              onClick={() => {
                                setMenuAberto(null);
                                router.push(
                                  `/registrar-ocorrencia?id=${ocorrencia.id}`
                                );
                              }}
                            >
                              ✎ Editar
                            </button>

                            <button
                              type="button"
                              className={styles.menuExcluir}
                              onClick={() =>
                                excluirOcorrencia(
                                  ocorrencia.id
                                )
                              }
                            >
                              🗑 Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className={styles.descricao}>
                    {ocorrencia.descricao ||
                      "Descrição da ocorrência..."}
                  </p>

                  <div className={styles.providenciasBox}>
                    <span className={styles.providenciasTitulo}>
                      ☑ Providências
                    </span>

                    <p className={styles.providenciasTexto}>
                      {ocorrencia.providencias ||
                        "Nenhuma providência registrada."}
                    </p>
                  </div>

                  <div className={styles.rodape}>
                    <span className={styles.envolvidos}>
                      <IconeEnvolvidos />

                      <span>
                        {envolvidos.length
                          ? envolvidos
                              .map(
                                (envolvido) =>
                                  `${envolvido.nome} (${envolvido.matricula})`
                              )
                              .join(", ")
                          : "Envolvidos..."}
                      </span>
                    </span>

                    <span className={styles.data}>
                      {formatarData(ocorrencia.data)}
                    </span>
                  </div>
                </article>
              );
            })}
        </main>

        {!carregando && !erro && (
          <footer className={styles.footer}>
            Registros: {ocorrencias.length}
          </footer>
        )}
      </div>
    </div>
  );
}