import { Action, ActionPanel, Detail, List, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { createMachine, interpret } from 'xstate';
import fs from "fs";
import { Icon } from "@raycast/api";
import axios from 'axios';


interface Preferences {
    name: string,
    search_path?: string,
}

interface PathContentItem {
    name: string,
    stats: fs.Stats
}

function loadDirectory(paths: Array<String>) {
    return new Promise((resolve, reject) => {
        fs.readdir(paths.at(-1), (err, files) => {
            if (err) {
                reject(err);
                return;
            }
            Promise.all(files.map((item) => {
                return new Promise((resolve, reject) => {
                    fs.stat(paths.at(-1) + item, (err, stats) => {
                        if (err) {
                            reject(err)
                        }
                        else {
                            resolve({ "name": item, "stats": stats })
                        }
                    })
                }
                )
            })).then((value) => resolve(value))
        })
    });
}

function readFile(path: string) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, (err, data) => {
            if (err) {
                reject(err)
            }
            else {
                resolve(data.toString())
            }
        })
    })
}

function sendRequest(content: string) {
    console.log("Normal deps")
    return axios.get("http://127.0.0.1:3141/sqldep", { data: { sql: content }, responseType: "json" })
}

function sendColumnRequest(content: string){
    console.log("Column Level Request")
    return axios.get("http://127.0.0.1:3141/sqlcoldep", { data: { sql: content }, responseType: "json" })
}

export default function SQLDEP() {
    const [state, setState] = useState("loadingPreferences");
    const [paths, setPaths] = useState<Array<String>>([]);
    const [pathContent, setPathContent] = useState<Array<PathContentItem>>([]);
    const [transistionService, setTransitionService] = useState(null);
    const [response, setResponse] = useState(null);
    const [statement, setStatement] = useState(null);
    const [column, setColumn] = useState(null);

    const statemachine = createMachine({
        /** @xstate-layout N4IgpgJg5mDOIC5SwC4EMVgHQBsD2aEAlgHZQAKATmAGZjUkDGcAxACIDyAcgKIDaABgC6iUAAc8sIiiJ4SokAA9EAJgDMAdixqArAE5NAFgCMGgBwA2Y9bMAaEAE9Eai2qxmNOgRfU6b+tQBfQPtUDGx8QlIKajoGZlgWLg4AFQB9ADEOAFUuNkERJBAJKRk5BWUEdS1dAw0TcysbeycENQEdbU8BAXM1YwEVIeDQ9EwsYmpGFDxKBwA1IjAAdxYAZR48tIAlHgBFbJ41lIKFEulZeSLKnUMzLq9rFTNDATM9CxbnV3dun11-AYRiAwuNlmhpBlZtswABHACucBQLF2ByO6U4vDSAFlsgAZFIASTSxwAgikeNjNidhGdJBdytdEHpvFgPh5brcLBZDOYvlVDBZtGoRToLAJjCpjB8XMDQdhwZDoXDEagUftDsc0pieCTCVwAOJ43VkilUrg0wriellK6gSosoXszyGLk8vmORBmYxYLw9CXcvReHSaOVjbDygC2YBIKDWYBwYGml3WPGNAGFLXTSpcKohjHcVFhjDyBEGLHpjH4zCp+SpBlgVH7eo8zGY1HpDGHwlgozG4wmk7bUxn0umOHjTkVzra8wgCzXi6Xy5Xq7XPVUdEXugI1Cpua4212QiDw1hFSgoZQYQikSxx3idhr0druCb9UaTSlyZTqVPrTmjL2syrLOpygrunYG6aG4zZNiGIYeBY3bjIweA4PCkYkPGibTCOPCZv+xQ2rmTLzhoejbmohjUT4JjtpK-IuEKTY9M87SDCGgrBCeJB4BAcAKPK2YMnaSiIAAtJ8G4SZ0ejyXoGjmDY+46LcKERAQxBkFQtD0DGCQibOZGGOurS6FoQbtl4R56JYNEaRMRBTDMcyLCsRmkcBbSUVgbz6LyZYmPWUHmTyDwSp2QZKZRGiOReV43qqKCeUB4kIBozzuHZNEsu2ErPEx4WaI8UU6DFKhxSe8q9uG0axjhQ5ecRgFiZUkpmHJJX1gYxhmL0Gh1oK7giro4qStKrjIdVZ4CWI7nLKlbX5q4ei+lW3IlhRYoGPy0qdM2krtBorgFo5YixDwlCULMS1zh2Rb+Z2GhBZKbxMR0vx+n0AxDCojloTgbBgPNSyLdOJFpe1lZuCopmmJKW7qGoRVCju0oqEGal7gD6GYdhg7THdZElh261ilYFjbRWKPQdyWD1Ap+gaJoLPHsEQA */
        id: 'state',
        initial: 'loadingPreferences',
        predictableActionArguments: true,
        states: {
            loadingPreferences: {
                on: {
                    DONE: "directoryView",
                    NOT_FOUND: "prefError"
                }
            },

            directoryView: {
                on: {
                    SEND_REQUEST: "waitForRequest"
                }
            },

            waitForRequest: {
                on: {
                    REQUEST_DONE_SINGLE_STATEMENT: "depView",
                    COL_REQUEST_DONE_SINGLE_STATEMENT: "columnSelect",
                    REQUEST_DONE_MULTI_STATEMENT:"statementSelection"
                }
            },

            statementSelection: {
                on: {
                    SELECT: "depView",
                    SELECT_COL: "columnSelect"
                }
            },

            depView: {},
            prefError: {},
            colDepView: {},
            columnSelect: {
                on:{
                    COL_SELECT: "colDepView"
                }
            }
        }
    });
    useEffect(() => {
        const transistionService = interpret(statemachine)
            .onTransition((state) => { console.log(state.value); setState(state.value.toString()) })
            .start();
        setTransitionService(transistionService);

        const pref = getPreferenceValues<Preferences>();
        if (pref.search_path !== undefined && pref.search_path !== "") {
            console.log(pref.search_path)
            setPaths([...paths, pref.search_path])
            loadDirectory([...paths, pref.search_path]).then((content) => {
                console.log(content)
                setPathContent(content)
                transistionService.send("DONE");
            })
        }
        else {
            transistionService.send("NOT_FOUND")
        }

    }, [])

    return (
        <>
            {state === "loadingPreferences" || transistionService === null ?
                <Detail isLoading={true} markdown="# Loading preferences" /> : null
            }
            {state === "prefError" ?
                <Detail markdown="# No path found" /> : null
            }
            {state === "directoryView" ?
                pathContent.length == 0 ? null :
                    <List>
                        {pathContent.map((element, i) =>
                            <List.Item icon={element.stats.isDirectory() ? Icon.Folder : null} key={"element_" + i} title={element.name} actions={
                                <ActionPanel>
                                    {element.stats.isDirectory() ? <Action title="Open Folder" onAction={() => {
                                        console.log(paths.at(-1) + element.name + "/")
                                        loadDirectory([...paths, paths.at(-1) + element.name + "/"]).then((content) => {
                                            setPaths([...paths, paths.at(-1) + element.name + "/"])
                                            setPathContent(content)
                                        })
                                    }} /> : <><Action title="Open File" onAction={() => {
                                        readFile(paths.at(-1) + "/" + element.name).then((content) => {
                                            transistionService.send("SEND_REQUEST")
                                            sendRequest(content).then((value) => {
                                                setResponse(value.data);
                                                if (value.data.number_of_statements > 1) {
                                                    transistionService.send("REQUEST_DONE_MULTI_STATEMENT")
                                                } else {
                                                    setStatement(value.data.dependencies[0])
                                                    transistionService.send("REQUEST_DONE_SINGLE_STATEMENT")
                                                }
                                            })
                                        })
                                    }} />
                                    <Action title="Open File with column level lineage" onAction={() => {
                                        readFile(paths.at(-1) + "/" + element.name).then((content) => {
                                            transistionService.send("SEND_REQUEST")
                                            sendColumnRequest(content).then((value) => {
                                                setResponse(value.data);
                                                if (value.data.number_of_statements > 1) {
                                                    transistionService.send("REQUEST_DONE_MULTI_STATEMENT")
                                                } else {
                                                    setStatement(value.data.dependencies[0])
                                                    transistionService.send("COL_REQUEST_DONE_SINGLE_STATEMENT")
                                                }
                                            })
                                        }).catch((reason) => console.log(reason))
                                    }}/></>
                                    }

                                </ActionPanel>
                            } />
                        )}
                    </List> : null

            }
            {state === "waitForRequest" ?
                <Detail isLoading={true} markdown="# Loading dependencies" /> : null
            }
            {state === "statementSelection" && response !== null && transistionService !== null ?
                <List>
                    {response.dependencies.map((el: any, i: number) => {
                        return <List.Item key={"statement_" + i} title={el.statement} actions={
                            <ActionPanel>
                                <Action title="Select statement" onAction={() => {
                                    setStatement(el);
                                    console.log(el)
                                    if(el.columns!==undefined){
                                        transistionService.send("SELECT_COL");
                                    }
                                    else{
                                        transistionService.send("SELECT");
                                    }
                                }} />
                            </ActionPanel>
                        } />
                    })}
                </List> : null
            }
            {state === "depView" && statement !== null ?
                <List searchBarPlaceholder={"Dependencies for table "+statement.target}>
                    {statement.tables.map((table: string, i: number) => {
                        return <List.Item key={"dependency_" + i} title={table} />
                    })}
                </List> : null
            }
            {state === "columnSelect" && statement !== null && statement.columns !== undefined?
            <List searchBarPlaceholder="Select column you want to see dependencies for">
                {statement.columns.map((col,i) => <List.Item key={"col_"+i} title={col.column} actions={
                    <ActionPanel>
                        <Action title="Show sources for column" onAction={() => {
                            setColumn(col);
                            transistionService.send("COL_SELECT");
                        }}/>
                    </ActionPanel>
                }/>)}
            </List>:null
            }
            {state === "colDepView" && column !== null?
                <List searchBarPlaceholder={"Dependencies for column "+column.column}>
                    {column.dependencies.map((dep, i) => <List.Item key={"col_dep_"+i} title={dep}/>)}
                </List>:null
            }
        </>
    );
}