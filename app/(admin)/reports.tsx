import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { db } from '../../services/firebaseConfig';
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

interface Report {
  id: string;
  reportedId: string;
  reporterId: string;
  reason: string;
  timestamp: any;
  type: 'user' | 'group';
  status?: string;
}

interface ReportWithNames extends Report {
  reportedName?: string;
  reporterName?: string;
}

export default function ReportsDashboard() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportWithNames[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserRole();
      fetchReportsWithNames();
    }
  }, [user]);

  const fetchUserRole = async () => {
    if (!user) return;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      setUserRoles(userDoc.data().role || null);
    }
  };

  const getUserDisplayName = (userData: any, fallback: string) => {
    return userData?.username || userData?.name || userData?.email || fallback;
  };

  const fetchReportsWithNames = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'reports'));
      const reportList: Report[] = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as Report[];
      // Fetch names for reported and reporter
      const reportsWithNames: ReportWithNames[] = await Promise.all(reportList.map(async (report) => {
        let reportedName = report.reportedId;
        let reporterName = report.reporterId;
        if (report.type === 'user') {
          const reportedDoc = await getDoc(doc(db, 'users', report.reportedId));
          if (reportedDoc.exists()) {
            reportedName = getUserDisplayName(reportedDoc.data(), report.reportedId);
          }
        } else if (report.type === 'group') {
          const groupDoc = await getDoc(doc(db, 'groups', report.reportedId));
          if (groupDoc.exists()) {
            reportedName = groupDoc.data().name || report.reportedId;
          }
        }
        // Reporter is always a user
        const reporterDoc = await getDoc(doc(db, 'users', report.reporterId));
        if (reporterDoc.exists()) {
          reporterName = getUserDisplayName(reporterDoc.data(), report.reporterId);
        }
        return { ...report, reportedName, reporterName };
      }));
      setReports(reportsWithNames);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const markResolved = async (reportId: string) => {
    await updateDoc(doc(db, 'reports', reportId), { status: 'resolved' });
    fetchReportsWithNames();
  };

  const banUser = async (userId: string) => {
    await updateDoc(doc(db, 'users', userId), { banned: true });
    Alert.alert('User banned');
  };

  const removeGroup = async (groupId: string) => {
    await deleteDoc(doc(db, 'groups', groupId));
    Alert.alert('Group removed');
  };

  if (!user) {
    return <View style={styles.centered}><Text>You must be logged in as an admin to view this page.</Text></View>;
  }
  if (userRoles !== 'admin') {
    return <View style={styles.centered}><Text>Access denied. Admins only.</Text></View>;
  }
  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Admin Reports Dashboard</Text>
      {reports.length === 0 ? (
        <Text style={styles.noReports}>No reports found.</Text>
      ) : (
        reports.map(report => (
          <View key={report.id} style={styles.reportCard}>
            <Text style={styles.reportType}>{report.type === 'user' ? 'User Report' : 'Group Report'}</Text>
            <Text style={styles.reportLabel}>Reported: <Text style={styles.reportValue}>{report.reportedName}</Text></Text>
            <Text style={styles.reportLabel}>Reporter: <Text style={styles.reportValue}>{report.reporterName}</Text></Text>
            <Text style={styles.reportLabel}>Reason: <Text style={styles.reportValue}>{report.reason}</Text></Text>
            <Text style={styles.reportLabel}>Time: <Text style={styles.reportValue}>{report.timestamp?.toDate ? new Date(report.timestamp.toDate()).toLocaleString() : ''}</Text></Text>
            <Text style={styles.reportLabel}>Status: <Text style={styles.reportValue}>{report.status || 'pending'}</Text></Text>
            <View style={styles.actionsRow}>
              {report.status !== 'resolved' && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => markResolved(report.id)}>
                  <Text style={styles.actionBtnText}>Mark Resolved</Text>
                </TouchableOpacity>
              )}
              {report.type === 'user' && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#e57373' }]} onPress={() => banUser(report.reportedId)}>
                  <Text style={styles.actionBtnText}>Ban User</Text>
                </TouchableOpacity>
              )}
              {report.type === 'group' && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#e57373' }]} onPress={() => removeGroup(report.reportedId)}>
                  <Text style={styles.actionBtnText}>Remove Group</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 60,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4c669f',
    marginBottom: 18,
    marginTop: 10,
  },
  noReports: {
    fontSize: 16,
    color: '#888',
    marginTop: 40,
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  reportType: {
    fontWeight: 'bold',
    color: '#e57373',
    marginBottom: 6,
  },
  reportLabel: {
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  reportValue: {
    fontWeight: '400',
    color: '#222',
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
  },
  actionBtn: {
    backgroundColor: '#4c669f',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
}); 