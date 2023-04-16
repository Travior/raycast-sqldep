import { useState } from "react"
import StatementColumnSelect from "./StatementColumnSelect"
import { List } from "@raycast/api";

export default function ColumnLevelLineageView(props:any){
    const [column, setColumn] = useState(null);
    console.log(column)
    return(
        <>
            {column!==null?
            <List>
                {column.dependencies.map((el,i) => <List.Item title={el} key={"column_"+i} />)}
            </List>:
            <StatementColumnSelect data={props.data} setter={setColumn} />}
        </>
    )
}