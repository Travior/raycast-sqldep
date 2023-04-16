import { Action, ActionPanel, List, Icon, useNavigation } from "@raycast/api";
import fs from "fs";
import React from "react";
import { useEffect, useState } from "react";
import axios from "axios";
import LineageView from "./LineageView";
import ColumnLevelLineageView from "./ColumnLevelLineageView";

interface PathContentItem {
    name: string,
    stats: fs.Stats
}

function sendRequest(content: string) {
    console.log("Normal deps")
    return axios.get("http://127.0.0.1:3141/sqldep", { data: { sql: content }, responseType: "json" })
}

function sendColumnRequest(content: string) {
    console.log("Column Level Request")
    return axios.get("http://127.0.0.1:3141/sqlcoldep", { data: { sql: content }, responseType: "json" })
}

function readFile(path: string): Promise<string> {
    console.log(path)
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

function loadDirectory(path: string): Promise<PathContentItem[]> {
    return new Promise((resolve, reject) => {
        fs.readdir(path, (err, files) => {
            if (err) {
                reject(err);
                return;
            }
            Promise.all(files.map((item) => {
                return new Promise<PathContentItem>((resolve, reject) => {
                    fs.stat(path + item, (err, stats) => {
                        if (err) {
                            reject(err)
                        }
                        else {
                            let res: PathContentItem = { "name": item, "stats": stats };
                            resolve(res)
                        }
                    })
                }
                )
            })).then((value) => resolve(value))
        })
    });
}



export default function DirectoryView(props: { path: string }) {
    const [loading, setLoading] = useState(true);
    const [pathContent, setPathContent] = useState<PathContentItem[]>([]);
    const { push } = useNavigation();
    useEffect(() => {
        loadDirectory(props.path).then((value) => {
            setLoading(false);
            setPathContent(value);
        });

    }, [])
    return (
        <List isLoading={loading}>
            {pathContent.map((element, i) =>
                <List.Item icon={element.stats.isDirectory() ? Icon.Folder : Icon.Bookmark} key={"element_" + i} title={element.name} actions={
                    <ActionPanel>
                        {element.stats.isDirectory() ? <Action title="Open Folder" onAction={() => {
                            console.log(props.path + element.name + "/");
                            push(<DirectoryView path={props.path + element.name + "/"} />);
                        }
                        } /> : <><Action title="Open File" onAction={() => {
                            setLoading(true);
                            console.log(props.path + element.name)
                            readFile(props.path + element.name).then(
                                (content) => {
                                    sendRequest(content).then((response) => {
                                        setLoading(false);
                                        push(<LineageView data={response.data} />)
                                    })
                                }
                            )
                        }} />
                            <Action title="Open File with column level lineage" onAction={() => {
                                setLoading(true);
                                console.log(props.path + element.name)
                                readFile(props.path + element.name).then(
                                    (content) => {
                                        sendColumnRequest(content).then((response) => {
                                            setLoading(false);
                                            push(<ColumnLevelLineageView data={response.data} />)
                                        })
                                    }
                                )
                            }} /></>
                        }

                    </ActionPanel>
                } />
            )}
        </List>
    )
}