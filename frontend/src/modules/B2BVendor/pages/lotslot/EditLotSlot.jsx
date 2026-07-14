import LotSlotForm from "../../components/LotSlotForm";
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';

const EditLotSlot = () => {
    const { id } = useParams();
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Edit Lot/Slot</h1>
                <p className="text-gray-500">Update your lot or slot listing details.</p>
            </div>

            <LotSlotForm isEdit={true} id={id} />
        </motion.div>
    );
};

export default EditLotSlot;
