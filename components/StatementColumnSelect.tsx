import { ActionPanel, List, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import React from "react";
import StatementSelect from "./StatementSelect";

interface Statement{
    columns:Column[],
    statement:string,
    source:string,
    target:string
}

interface Column{
    column:string,
    dependencies:string[]
}

export default function StatementColumnSelect(props:{data:any, setter:Function}){
    const [statement, setStatement] = useState<Statement|null>(null);
    useEffect(() => {
        if(props.data.number_of_statements == 1){
            setStatement(props.data.dependencies.at(0))
        }
    })
    return(
        <>
        {statement!==null?
        <List>
            {statement.columns.map((el,i) => <List.Item title={el.column} key={"column_"+i} actions={
                <ActionPanel>
                    <Action title="Select column" onAction={() => props.setter(el)} />
                </ActionPanel>
            }/>)}
        </List>
        :
        <StatementSelect data={props.data} setter={setStatement} />
        }
        </>
    )
}