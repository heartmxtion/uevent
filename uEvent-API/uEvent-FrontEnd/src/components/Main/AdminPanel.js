import { jwtDecode } from "jwt-decode";
import axios from "axios";
import React, { useState, useEffect } from "react";
import {
  Paper,
  Container,
  CircularProgress,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Autocomplete,
} from "@mui/material";
import ErrorPage from "./ErrorPage";

function AdminPanel() {
  const jwtToken = localStorage.getItem("jwtToken");
  const userId = jwtToken != null ? jwtDecode(jwtToken).userId : 0;
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState(null);
  const [topics, setTopics] = useState(null);
  const [formats, setFormats] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [loadingFormats, setLoadingFormats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [companies, setCompanies] = useState(null);
  const [openTopicDialog, setOpenTopicDialog] = useState(false);
  const [openFormatDialog, setOpenFormatDialog] = useState(false);
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const roles = [
    { id: 0, title: "user" },
    { id: 1, title: "admin" }
  ];
  const [selectedRole, setSelectedRole] = useState(roles[0]);
  const [topicFormData, setTopicFormData] = useState({
    title: "",
  });

  const [formatFormData, setFormatFormData] = useState({
    title: "",
  });

  const headers = {
    Authorization: `Bearer ${jwtToken}`,
  };

  const [userFormData, setUserFormData] = useState({
    login: "",
    email: "",
    password: "",
    passwordConfirm: "",
    role: selectedRole,
  });

  const handleRoleChange = (event, newValue) => {
    if (newValue !== null) {
      setSelectedRole(newValue);
    }
  };

  const fetchAdminData = async () => {
    try {
      await axios
        .get(`http://localhost:3000/api/admins/${userId}`, {
          headers: headers,
        })
        .then((response) => {
          const data = response.data;
          setUser(data);
        });
    } catch (error) {
      console.error("Ошибка при получении данных пользователя:", error);
    } finally {
      setLoadingUser(false);
    }
  };

  const fetchTopics = async () => {
    try {
      await axios
        .get(`http://localhost:3000/api/topics`)
        .then((response) => {
          const data = response.data;
          setTopics(data);
        });
    } catch (error) {
      console.error("Ошибка при получении данных тем:", error);
    } finally {
      setLoadingTopics(false)
    }
  };

  const fetchFormats = async () => {
    try {
      await axios
        .get(`http://localhost:3000/api/formats`)
        .then((response) => {
          const data = response.data;
          setFormats(data);
        });
    } catch (error) {
      console.error("Ошибка при получении данных форматов:", error);
    } finally {
      setLoadingFormats(false)
    }
  };

  const fetchUsers = async () => {
    try {
      await axios.get(`http://localhost:3000/api/users`).then((response) => {
        const data = response.data;
        setUsers(data);
      });
    } catch (error) {
      console.error("Ошибка при получении данных пользователя:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await axios.get(`http://localhost:3000/api/admin/companies`, {
        headers: headers,
      });
      const data = response.data;
      setCompanies(data);
    } catch (error) {
      console.error("Ошибка при получении данных компаний:", error);
    }
  };  

  const handleOpenTopicDialog = () => setOpenTopicDialog(true);
  const handleCloseTopicDialog = () => setOpenTopicDialog(false);
  const handleOpenFormatDialog = () => setOpenFormatDialog(true);
  const handleCloseFormatDialog = () => setOpenFormatDialog(false);
  const handleOpenUserDialog = () => setOpenUserDialog(true);
  const handleCloseUserDialog = () => setOpenUserDialog(false);

  const handleTopicFormChange = (event) => {
    setTopicFormData({
      ...topicFormData,
      [event.target.name]: event.target.value,
    });
  };

  const handleFormatFormChange = (event) => {
    setFormatFormData({
      ...formatFormData,
      [event.target.name]: event.target.value,
    });
  };

  const handleUserFormChange = (event) => {
    setUserFormData({
      ...userFormData,
      [event.target.name]: event.target.value,
    });
  };

  const handleTopicSubmit = async () => {
    try {
      await axios.post('http://localhost:3000/api/topics', topicFormData, {
        headers: headers,
      });
      setTopicFormData({ title: ''});
      handleCloseTopicDialog();
      fetchTopics();
    } catch (error) {
      console.error('Error while creating topic:', error);
    }
  };

  const handleFormatSubmit = async () => {
    try {
      await axios.post('http://localhost:3000/api/formats', formatFormData, {
        headers: headers,
      });
      setFormatFormData({ title: ''});
      handleCloseFormatDialog();
      fetchFormats();
    } catch (error) {
      console.error('Error while creating format:', error);
    }
  };
  
  const handleUserSubmit = async () => {
    try {
      const userData = {
        ...userFormData,
        role: selectedRole.title,
      };
      await axios.post('http://localhost:3000/api/users', userData, {
        headers: headers,
      });
      setUserFormData({
        login: '',
        email: '',
        password: '',
        passwordConfirm: '',
        role: selectedRole.title,
      });
      setSelectedRole(roles[0]);
      handleCloseUserDialog();
      fetchUsers();
    } catch (error) {
      console.error('Error while creating user:', error);
    }
  };

  useEffect(() => {
    if (userId !== null) {
      fetchAdminData();
      fetchTopics();
      fetchFormats();
      fetchUsers();
      fetchCompanies();
    }
    // eslint-disable-next-line
  }, [userId]);

  if (loadingUser || loadingTopics || loadingFormats|| loadingUsers) {
    return <CircularProgress sx={{ marginTop: "18%", marginLeft: "50%" }} />;
  }

  const handleConfirmCompany = async (companyId) => {
    try {
      const company = companies.find((company) => company.company_id === companyId);
      if (!company.email_confirmed) {
        alert('Company email is not confirmed. Cannot approve.');
        return;
      }
  
      await axios.put(`http://localhost:3000/api/companies/${companyId}/confirm`, null, {
        headers: headers,
      });

      alert('Company approved successfully');
      fetchCompanies();
    } catch (error) {
      console.error('Error while confirming company:', error);
    }
  };  

const handleDenyCompany = async (companyId) => {
    try {
      await axios.put(`http://localhost:3000/api/companies/${companyId}/deny`, null, {
        headers: headers,
      });
      alert('Company denied successfully');
      fetchCompanies();
    } catch (error) {
      console.error('Error while denying company:', error);
    }
  };

  return (
    <>
      {!user || (user && user.role !== "admin") ? (
        <ErrorPage />
      ) : (
        <Container sx={{ marginTop: "2rem", paddingBottom: "130px" }}>
          <Paper
            elevation={3}
            sx={{
              textAlign: "center",
              padding: "20px",
              marginBottom: "10px",
            }}
          >
            <Typography variant="h4" gutterBottom>
              Admin panel
            </Typography>
          </Paper>
          <Paper
            sx={{
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "20px",
              padding: "20px",
            }}
          >
            <Paper
              elevation={3}
              sx={{ width: "545px", height: "525px", textAlign: "center" }}
            >
              <Typography variant="h4" gutterBottom>
                Topics
              </Typography>
              <Button onClick={handleOpenTopicDialog}>Create new</Button>
              <TableContainer sx={{maxHeight: '435px'}} component={Paper}>
                <Table stickyHeader sx={{ minWidth: 500 }} aria-label="simple table">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell align="center">Title</TableCell>

                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topics && topics.map((row) => (
                      <TableRow
                        key={row.theme_id}
                        sx={{
                          "&:last-child td, &:last-child th": { border: 0 },
                        }}
                      >
                        <TableCell align="center" scope="row">
                          {row.theme_id}
                        </TableCell>
                        <TableCell align="center" scope="row">
                          {row.theme_name}
                        </TableCell>

                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Dialog
                open={openTopicDialog}
                onClose={handleCloseTopicDialog}
              >
                <DialogTitle>Create New Topic</DialogTitle>
                <DialogContent>
                  <TextField
                    required
                    autoFocus
                    margin="dense"
                    id="title"
                    name="title"
                    label="Title"
                    type="text"
                    fullWidth
                    value={topicFormData.title}
                    onChange={handleTopicFormChange}
                  />
                </DialogContent>
                <DialogActions>
                  <Button onClick={handleCloseTopicDialog}>Cancel</Button>
                  <Button onClick={handleTopicSubmit} color="primary">
                    Create
                  </Button>
                </DialogActions>
              </Dialog>
            </Paper>
            <Paper
              elevation={3}
              sx={{ width: "545px", height: "525px", textAlign: "center" }}
            >
              <Typography variant="h4" gutterBottom>
                Formats
              </Typography>
              <Button onClick={handleOpenFormatDialog}>Create new</Button>
              <TableContainer sx={{maxHeight: '435px'}} component={Paper}>
                <Table stickyHeader sx={{ minWidth: 500 }} aria-label="simple table">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell align="center">Title</TableCell>

                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formats && formats.map((row) => (
                      <TableRow
                        key={row.format_id}
                        sx={{
                          "&:last-child td, &:last-child th": { border: 0 },
                        }}
                      >
                        <TableCell align="center" scope="row">
                          {row.format_id}
                        </TableCell>
                        <TableCell align="center" scope="row">
                          {row.format_name}
                        </TableCell>

                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Dialog
                open={openFormatDialog}
                onClose={handleCloseFormatDialog}
              >
                <DialogTitle>Create New Format</DialogTitle>
                <DialogContent>
                  <TextField
                    required
                    autoFocus
                    margin="dense"
                    id="title"
                    name="title"
                    label="Title"
                    type="text"
                    fullWidth
                    value={formatFormData.title}
                    onChange={handleFormatFormChange}
                  />
                </DialogContent>
                <DialogActions>
                  <Button onClick={handleCloseFormatDialog}>Cancel</Button>
                  <Button onClick={handleFormatSubmit} color="primary">
                    Create
                  </Button>
                </DialogActions>
              </Dialog>
            </Paper>
            <Paper
              elevation={3}
              sx={{ width: "545px", height: "525px", textAlign: "center" }}
            >
              <Typography variant="h4" gutterBottom>
                Users
              </Typography>
              <Button onClick={handleOpenUserDialog}>Create new</Button>
              <TableContainer sx={{maxHeight: '435px'}} component={Paper}>
                <Table stickyHeader sx={{ minWidth: 650 }} aria-label="simple table">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell align="center">Login</TableCell>
                      <TableCell align="center">FullName</TableCell>
                      <TableCell align="center">Role</TableCell>
                      <TableCell align="center">Email</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users && users.map((row) => (
                      <TableRow
                        key={row.id}
                        sx={{
                          "&:last-child td, &:last-child th": { border: 0 },
                        }}
                      >
                        <TableCell scope="row">{row.user_id}</TableCell>
                        <TableCell align="center" scope="row">
                          {row.login}
                        </TableCell>
                        <TableCell align="center">{row.full_name}</TableCell>
                        <TableCell align="center">{row.role}</TableCell>
                        <TableCell align="center">{row.email}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Dialog open={openUserDialog} onClose={handleCloseUserDialog}>
                <DialogTitle>Create New User</DialogTitle>
                <DialogContent>
                  <TextField
                    required
                    autoFocus
                    margin="dense"
                    id="login"
                    name="login"
                    label="Login"
                    type="text"
                    fullWidth
                    value={userFormData.login}
                    onChange={handleUserFormChange}
                  />
                  <TextField
                    required
                    autoFocus
                    margin="dense"
                    id="email"
                    name="email"
                    label="Email"
                    type="email"
                    fullWidth
                    value={userFormData.email}
                    onChange={handleUserFormChange}
                  />
                  <TextField
                    required
                    autoFocus
                    margin="dense"
                    id="password"
                    name="password"
                    label="Password"
                    type="password"
                    fullWidth
                    value={userFormData.password}
                    onChange={handleUserFormChange}
                  />
                  <TextField
                    required
                    autoFocus
                    margin="dense"
                    id="passwordConfirm"
                    name="passwordConfirm"
                    label="Password Confirmation"
                    type="password"
                    fullWidth
                    value={userFormData.passwordConfirm}
                    onChange={handleUserFormChange}
                  />
                  <Autocomplete
                    id="roles"
                    options={roles}
                    getOptionLabel={(option) => option.title}
                    value={selectedRole}
                    isOptionEqualToValue={(option, value) =>
                      option.id === value.id
                    }
                    onChange={handleRoleChange}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="outlined"
                        label="Role"
                        required
                      />
                    )}
                  />
                </DialogContent>
                <DialogActions>
                  <Button onClick={handleCloseUserDialog}>Cancel</Button>
                  <Button onClick={handleUserSubmit} color="primary">
                    Create
                  </Button>
                </DialogActions>
              </Dialog>
            </Paper>
            <Paper
              elevation={3}
              sx={{ width: "545px", height: "525px", textAlign: "center" }}
            >
              <Typography variant="h4" gutterBottom>
                Companies Verification
              </Typography>
              <TableContainer sx={{ maxHeight: '435px' }} component={Paper}>
                <Table stickyHeader sx={{ minWidth: 650 }} aria-label="simple table">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell align="center">Company Name</TableCell>
                      <TableCell align="center">Email</TableCell>
                      <TableCell align="center">Email Confirmed</TableCell>
                      <TableCell align="center">Location</TableCell>
                      <TableCell align="center">User ID</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {companies && companies.map((row) => (
                      <TableRow
                        key={row.company_id}
                        sx={{
                          "&:last-child td, &:last-child th": { border: 0 },
                        }}
                      >
                        <TableCell scope="row">{row.company_id}</TableCell>
                        <TableCell align="center" scope="row">
                          {row.company_name}
                        </TableCell>
                        <TableCell align="center">{row.email}</TableCell>
                        <TableCell align="center">{row.email_confirmed ? '+' : '-'}</TableCell>
                        <TableCell align="center">{row.locationOf}</TableCell>
                        <TableCell align="center">{row.user_id}</TableCell>
                        <TableCell align="center">
                          {row.approved ? "Approved" : (
                            <>
                              <Button onClick={() => handleConfirmCompany(row.company_id)}>Confirm</Button>
                              <Button onClick={() => handleDenyCompany(row.company_id)}>Deny</Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Paper>
        </Container>
      )}
    </>
  );
}

export default AdminPanel;