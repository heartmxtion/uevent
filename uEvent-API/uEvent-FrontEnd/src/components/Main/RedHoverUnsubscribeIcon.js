import { styled } from '@mui/system';
import UnsubscribeIcon from '@mui/icons-material/Unsubscribe';

const RedHoverUnsubscribeIcon = styled(UnsubscribeIcon)({
  marginRight: '35px',
  '&:hover': {
    color: 'red',
    cursor: 'pointer',
  },
});

export default RedHoverUnsubscribeIcon;