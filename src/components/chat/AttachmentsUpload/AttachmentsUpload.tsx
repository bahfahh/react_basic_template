import { FC } from 'react';
import { Attachments } from '@ant-design/x';

interface AttachmentsUploadProps {
  onFileSelect: (filename: string) => void;
  disabled?: boolean;
}

export const AttachmentsUpload: FC<AttachmentsUploadProps> = ({
  onFileSelect,
  disabled = false
}) => {
  return (
    <Attachments
      beforeUpload={() => false}
      onChange={({ file }) => {
        onFileSelect(file.name);
      }}
      placeholder={{
        title: 'Drop files here',
        description: 'Support images, documents, and more',
      }}
      disabled={disabled}
      items={[]}
    />
  );
};