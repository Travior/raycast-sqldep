import { useEffect, useState } from "react"
import DirectoryView from "../components/DirectoryView"
import { Detail, getPreferenceValues } from "@raycast/api";


interface Preferences {
    name: string,
    search_path: string,
}

export default function SQLDEP(){
    const [path, setPath] = useState<string|null>(null);
    useEffect(() => {
        const prefs = getPreferenceValues<Preferences>();
        setPath(prefs.search_path);
    }, [])
    return(
        <>
        {path!==null?
            <DirectoryView path={path}/>:
            <Detail markdown="# Preferences are not set"/>
        }
        </>
    )
}

