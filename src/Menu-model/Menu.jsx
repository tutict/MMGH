import {IonCol, IonMenuButton, IonMenuToggle, IonRow, IonTitle} from "@ionic/react";
import React from "react";

function Menu(){
    return(
    <IonRow>
        <IonCol size="auto">
            <IonMenuToggle>
                <IonMenuButton color="primary"></IonMenuButton>
            </IonMenuToggle>
        </IonCol>
        <IonCol size="auto">
            <IonTitle>菜单</IonTitle>
        </IonCol>
    </IonRow>
    );
}

export default Menu;