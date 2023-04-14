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
    return axios.get("http://127.0.0.1:3141/sqldep", { data: { sql: content }, responseType: "json" })
}

export default function SQLDEP() {
    const [state, setState] = useState("loadingPreferences");
    const [paths, setPaths] = useState<Array<String>>([]);
    const [pathContent, setPathContent] = useState<Array<PathContentItem>>([]);
    const [transistionService, setTransitionService] = useState(null);
    const [response, setResponse] = useState(null);
    const [statement, setStatement] = useState(null)

    const statemachine = createMachine({
        /** @xstate-layout N4IgpgJg5mDOIC5SwC4EMVgHQBsD2aEAlgHZQAKATmAGZjUkDGcAxACIDyAcgKIDaABgC6iUAAc8sIiiJ4SokAA9EAJgDMAdixqArAE41BgXoGaAHGpUAaEAE9EZrXoCMANlcbnKja+d6fKgC+gTaoGNj4hKQU1HQMzLAsXBwAKgD6AGIcAKpcbIIiSCASUjJyCsoI6lq6BkYm5pY29gjOACyuWG1urhZmKip6HWptwaHomFjE1IwoeJS2AGpEYADuLADKPHlpAEo8AIrZPBspBQol0rLyRZU6bWbaGjoCzmbOAjqGOmbNDk49TzeXz+VxBEIgMKTVZoaQZea7MAARwArnAUCx9kcTulOLw0gBZbIAGRSAEk0qcAIIpHgE7ZnYQXSRXcq3Bx6TqcxxmATvQzONTOP4Id5dPQSvS8wyWfp6MaQibYGFwhHItGoTGHY6nNJ4niUslcADixIN1Np9K4jMK4hZZRuoEqZk5WG5Gl5-JcQpFKgEKiwKjakueQz5Oh8Cqh2GjAFswCQUBswDgwLNrpseGaAMI25mla4VRDtNRqLBmDx+sFmB4aNQisXByXSgwqOXBCEkPAQOAKaP51mOpSIAC0rhFY6wAmn07cNenPlcowh0dwBGIZCotHoCYSA4dRYQbWsdkQQ3LpZGAzrOm8EqjSqmRBmcwWyzW+8L7IQhgD4bDrilkGAgaG0DaPN07gaBoEoPO0bQ6A+4RYCqKDwpQiKouin5sk6iAaG25ZSm0oEjO8rg6OOp6ihBPQ6M4XimCRzhIZMcYJkmKZpgeRSXDxeGtNUWBLgIYIev0bYeg2f4zgIJERkMLxmKx2A9mI76rDhQ6VM4Oj3E8LyWHJErtA2eiBk2NYIWovRyWoKlYGIsQ8JQlDzFph6-lOZj6G0olAX5oEiu0XI9IBUHGBGiEdkAA */
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
                    REQUEST_DONE_MULTI_STATEMENT: "statementSelection",
                    REQUEST_DONE_SINGLE_STATEMENT: "depView"
                }
            },
            statementSelection: {
                on: {
                    SELECT: "depView"
                }
            },
            depView: {},
            prefError: {}

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
            {state === "loadingPreferences" ?
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
                                    }} /> : <Action title="Open File" onAction={() => {
                                        readFile(paths.at(-1) + "/" + element.name).then((content) => {
                                            transistionService.send("SEND_REQUEST")
                                            sendRequest(content).then((value) => {
                                                setResponse(value.data);
                                                if (value.data.number_of_statements > 1) {
                                                    transistionService.send("REQUEST_DONE_MULTI_STATEMENT")
                                                } else {
                                                    transistionService.send("REQUEST_DONE_SINGLE_STATEMENT")
                                                }
                                            })
                                        })
                                    }} />}

                                </ActionPanel>
                            } />
                        )}
                    </List> : null

            }
            {state === "waitForRequest" ?
                <Detail isLoading={true} markdown="# Loading dependencies" /> : null
            }
            {state === "statementSelection" && response !== null ?
                <List>
                    {response.dependencies.map((el: any, i: number) => {
                        return <List.Item key={"statement_" + i} title={el.statement} actions={
                            <ActionPanel>
                                <Action title="Select statement" onAction={() => {
                                    setStatement(el);
                                    transistionService.send("SELECT");
                                }} />
                            </ActionPanel>
                        } />
                    })}
                </List> : null
            }
            {state === "depView" && statement!==null?
            <List navigationTitle="Dependencies">
                {statement.tables.map((table:string, i:number) => {
                    return <List.Item key={"dependency_"+i} title={table} />
                })}
            </List>:null
        }
        </>
    );
}