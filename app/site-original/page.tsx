import {redirect} from "next/navigation";

/** Link amigável para o site estático original preservado integralmente. */
export default function SiteOriginalPage(){
 redirect("/site-original/index.html");
}
