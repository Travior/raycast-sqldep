import { Action, ActionPanel, List } from "@raycast/api";
import React from "react";

export default function StatementSelect(props:{data:any, setter:Function}){
    return(
        <List>
            {props.data.dependencies.map((el, i) => <List.Item title={el.statement} key={"statement_"+i} actions={
                <ActionPanel>
                    <Action title="Select Statement" onAction={() => {props.setter(el)}}/>
                </ActionPanel>
            }/>)}
        </List>
    )
}