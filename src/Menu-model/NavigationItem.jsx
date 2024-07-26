import { IonItem, IonIcon, IonLabel } from '@ionic/react';
import { Link } from 'react-router-dom';
import { listCircle } from "ionicons/icons";

function NavigationItem({ to, color, label }) {
    return (
        <Link to={to}>
            <IonItem button={true}>
                <IonIcon color={color} slot="start" icon={listCircle} size="large"></IonIcon>
                <IonLabel>{label}</IonLabel>
            </IonItem>
        </Link>
    );
}

export default NavigationItem;
