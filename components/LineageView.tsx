import { useEffect, useState } from "react"
import StatementSelect from "./StatementSelect"
import React from "react";
import { List } from "@raycast/api";

export default function LineageView(props:any){
    const [statement, setStatement] = useState(null);
    useEffect(() => {
        if(props.data.number_of_statements == 1){
            setStatement(props.data.dependencies.at(0))
        }
    })
    
    return(
        <>
            {statement!==null?
                <List>
                    {statement.tables.map((el,i) => <List.Item title={el} key={"table_"+i} />)}
                </List>
            :<StatementSelect data={props.data} setter={setStatement}/>}
        </>
    )
}